-- Enhanced Facility Payment System Database Schema
-- This schema extends the existing payment system to support the new payment flow specification

-- Update facility_invoices payment_status enum to include new statuses
ALTER TABLE facility_invoices 
DROP CONSTRAINT IF EXISTS facility_invoices_payment_status_check;

ALTER TABLE facility_invoices 
ADD CONSTRAINT facility_invoices_payment_status_check 
CHECK (payment_status IN (
    'UNPAID',                              -- Initial state
    'PROCESSING PAYMENT',                  -- Check payment submitted, processing
    'PAID',                               -- Credit card/bank transfer completed
    'PAID WITH CARD',                     -- Credit/debit card payment completed
    'PAID WITH BANK TRANSFER',            -- Bank transfer payment completed
    'PAID WITH CHECK (BEING VERIFIED)',   -- Check received, pending verification
    'PAID WITH CHECK - VERIFIED',         -- Final verified check payment state
    'PENDING',                            -- Status reset to pending (retry payment)
    'NEEDS ATTENTION - RETRY PAYMENT'     -- Requires attention from facility
));

-- Add default payment method tracking to facilities table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facilities' AND column_name = 'default_payment_method_id') THEN
        ALTER TABLE facilities ADD COLUMN default_payment_method_id UUID REFERENCES facility_payment_methods(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update facility_payment_methods to include check payment type
ALTER TABLE facility_payment_methods 
DROP CONSTRAINT IF EXISTS facility_payment_methods_payment_method_type_check;

ALTER TABLE facility_payment_methods 
ADD CONSTRAINT facility_payment_methods_payment_method_type_check 
CHECK (payment_method_type IN ('card', 'bank_transfer', 'check'));

-- Add check payment fields to facility_payment_methods
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facility_payment_methods' AND column_name = 'check_payable_to') THEN
        ALTER TABLE facility_payment_methods ADD COLUMN check_payable_to VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facility_payment_methods' AND column_name = 'check_mailing_address') THEN
        ALTER TABLE facility_payment_methods ADD COLUMN check_mailing_address TEXT;
    END IF;
END $$;

-- Update facility_invoice_payments payment_method enum
ALTER TABLE facility_invoice_payments 
DROP CONSTRAINT IF EXISTS facility_invoice_payments_payment_method_check;

ALTER TABLE facility_invoice_payments 
ADD CONSTRAINT facility_invoice_payments_payment_method_check 
CHECK (payment_method IN (
    'credit_card', 
    'saved_card', 
    'bank_transfer', 
    'check_submit',      -- Pay now with check (submit request)
    'check_sent'         -- Check already sent
));

-- Create payment verification audit log table
CREATE TABLE IF NOT EXISTS payment_verification_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES facility_invoices(id) ON DELETE CASCADE,
    
    -- Audit details
    action VARCHAR(100) NOT NULL, -- 'status_change', 'payment_verified', 'payment_disputed', etc.
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- User who performed the action
    performed_by_user_id UUID NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL CHECK (performed_by_role IN ('facility', 'dispatcher', 'admin')),
    
    -- Additional context
    notes TEXT,
    verification_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment settings table for system-wide payment configuration
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Check payment settings
    check_payable_to VARCHAR(255) DEFAULT 'Compassionate Care Transportation',
    check_mailing_address TEXT DEFAULT '123 Main Street, City, State 12345',
    
    -- Payment processing settings
    stripe_webhook_endpoint_secret VARCHAR(255),
    payment_processing_fee_percentage DECIMAL(5,4) DEFAULT 0.029, -- 2.9%
    payment_processing_fee_fixed DECIMAL(10,2) DEFAULT 0.30,      -- $0.30
    
    -- Business settings
    invoice_due_days INTEGER DEFAULT 30,
    late_fee_percentage DECIMAL(5,4) DEFAULT 0.015, -- 1.5%
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default payment settings
INSERT INTO payment_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM payment_settings);

-- Function to handle payment status changes with audit logging
CREATE OR REPLACE FUNCTION update_payment_status_with_audit(
    p_invoice_id UUID,
    p_new_status VARCHAR(50),
    p_user_id UUID,
    p_user_role VARCHAR(50),
    p_notes TEXT DEFAULT NULL,
    p_verification_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(50);
    v_facility_id UUID;
BEGIN
    -- Get current status and facility_id
    SELECT payment_status, facility_id 
    INTO v_old_status, v_facility_id
    FROM facility_invoices 
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found with id: %', p_invoice_id;
    END IF;
    
    -- Update the invoice status
    UPDATE facility_invoices 
    SET payment_status = p_new_status,
        last_updated = NOW()
    WHERE id = p_invoice_id;
    
    -- Log the audit entry
    INSERT INTO payment_verification_audit_log (
        facility_id,
        invoice_id,
        action,
        old_status,
        new_status,
        performed_by_user_id,
        performed_by_role,
        notes,
        verification_notes
    ) VALUES (
        v_facility_id,
        p_invoice_id,
        'status_change',
        v_old_status,
        p_new_status,
        p_user_id,
        p_user_role,
        p_notes,
        p_verification_notes
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to set default payment method for facility
CREATE OR REPLACE FUNCTION set_default_payment_method(
    p_facility_id UUID,
    p_payment_method_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update facility's default payment method
    UPDATE facilities 
    SET default_payment_method_id = p_payment_method_id
    WHERE id = p_facility_id;
    
    -- Ensure the selected payment method is marked as default
    UPDATE facility_payment_methods 
    SET is_default = FALSE 
    WHERE facility_id = p_facility_id;
    
    UPDATE facility_payment_methods 
    SET is_default = TRUE 
    WHERE id = p_payment_method_id AND facility_id = p_facility_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_log_facility_id ON payment_verification_audit_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_log_invoice_id ON payment_verification_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_log_created_at ON payment_verification_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_facilities_default_payment_method ON facilities(default_payment_method_id) WHERE default_payment_method_id IS NOT NULL;

-- RLS Policies for payment_verification_audit_log
ALTER TABLE payment_verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Facilities can view their own audit logs
CREATE POLICY "Facilities can view their audit logs" ON payment_verification_audit_log
    FOR SELECT USING (
        facility_id IN (
            SELECT facility_id FROM profiles 
            WHERE id = auth.uid() AND role = 'facility'
        )
    );

-- Dispatchers and admins can view all audit logs
CREATE POLICY "Dispatchers and admins can view all audit logs" ON payment_verification_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
        )
    );

-- System can insert audit logs (function context)
CREATE POLICY "System can insert audit logs" ON payment_verification_audit_log
    FOR INSERT WITH CHECK (true);

-- RLS Policies for payment_settings
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage payment settings
CREATE POLICY "Admins can manage payment settings" ON payment_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Everyone can read payment settings (for display purposes)
CREATE POLICY "Everyone can read payment settings" ON payment_settings
    FOR SELECT USING (true);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_payment_settings_updated_at 
    BEFORE UPDATE ON payment_settings 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- View for dispatcher payment verification dashboard
CREATE OR REPLACE VIEW dispatcher_payment_verification_view AS
SELECT 
    fi.id as invoice_id,
    fi.invoice_number,
    fi.month,
    fi.total_amount,
    fi.payment_status,
    fi.created_at as invoice_created_at,
    fi.last_updated,
    
    -- Facility information
    f.id as facility_id,
    f.name as facility_name,
    f.email as facility_email,
    f.phone as facility_phone,
    
    -- Latest payment information
    fip.payment_method,
    fip.payment_date,
    fip.card_last_four,
    fip.billing_name,
    
    -- Audit trail count
    (SELECT COUNT(*) FROM payment_verification_audit_log WHERE invoice_id = fi.id) as audit_log_count,
    
    -- Latest audit entry
    (SELECT notes FROM payment_verification_audit_log 
     WHERE invoice_id = fi.id 
     ORDER BY created_at DESC 
     LIMIT 1) as latest_notes

FROM facility_invoices fi
JOIN facilities f ON fi.facility_id = f.id
LEFT JOIN facility_invoice_payments fip ON fi.id = fip.invoice_id
WHERE fi.payment_status IN (
    'PROCESSING PAYMENT',
    'PAID WITH CHECK (BEING VERIFIED)',
    'NEEDS ATTENTION - RETRY PAYMENT'
)
ORDER BY fi.last_updated DESC;

-- Grant permissions for the view
GRANT SELECT ON dispatcher_payment_verification_view TO authenticated;

COMMENT ON TABLE payment_verification_audit_log IS 'Audit trail for all payment status changes and verifications';
COMMENT ON TABLE payment_settings IS 'System-wide payment processing configuration';
COMMENT ON FUNCTION update_payment_status_with_audit(UUID, VARCHAR, UUID, VARCHAR, TEXT, TEXT) IS 'Updates payment status with automatic audit logging';
COMMENT ON FUNCTION set_default_payment_method(UUID, UUID) IS 'Sets default payment method for a facility';
COMMENT ON VIEW dispatcher_payment_verification_view IS 'Comprehensive view for dispatcher payment verification dashboard';