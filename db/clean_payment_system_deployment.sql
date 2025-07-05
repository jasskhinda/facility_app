-- Complete Facility Payment System Database Schema
-- This script sets up the entire payment system from scratch
-- Safe to run multiple times - uses CREATE TABLE IF NOT EXISTS

-- STEP 1: CREATE BASE TABLES

-- Table: facility_payment_methods
-- Stores saved payment methods for facilities
CREATE TABLE IF NOT EXISTS facility_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    
    stripe_payment_method_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Payment method type
    payment_method_type VARCHAR(50) NOT NULL CHECK (payment_method_type IN ('card', 'bank_transfer', 'check')),
    
    card_brand VARCHAR(50),
    last_four VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    cardholder_name VARCHAR(255),
    
    bank_account_last_four VARCHAR(4),
    bank_routing_number VARCHAR(10),
    bank_account_holder_name VARCHAR(255),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('checking', 'savings')),
    
    check_payable_to VARCHAR(255),
    check_mailing_address TEXT,
    
    nickname VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_default_per_facility UNIQUE NULLS NOT DISTINCT (facility_id, is_default)
);

-- Table: facility_invoices
-- Tracks invoice status and payment history for facilities
CREATE TABLE IF NOT EXISTS facility_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    month VARCHAR(7) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    total_trips INTEGER DEFAULT 0,
    
    -- Payment status tracking (enhanced with all new statuses)
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN (
        'UNPAID',
        'PROCESSING PAYMENT',
        'PAID',
        'PAID WITH CARD',
        'PAID WITH BANK TRANSFER',
        'PAID WITH CHECK (BEING VERIFIED)',
        'PAID WITH CHECK - VERIFIED',
        'PENDING',
        'NEEDS ATTENTION - RETRY PAYMENT'
    )),
    
    trip_ids UUID[],
    billing_email VARCHAR(255),
    
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for month per facility
    CONSTRAINT unique_facility_month UNIQUE (facility_id, month)
);

-- Table: facility_invoice_payments
-- Records individual payment transactions
CREATE TABLE IF NOT EXISTS facility_invoice_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES facility_invoices(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
        'credit_card', 'saved_card', 'bank_transfer', 'check_submit', 'check_sent'
    )),
    
    payment_method_id UUID REFERENCES facility_payment_methods(id) ON DELETE SET NULL,
    
    stripe_payment_intent_id VARCHAR(255),
    card_last_four VARCHAR(4),
    billing_name VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN (
        'pending', 'completed', 'failed', 'refunded'
    )),
    
    month VARCHAR(7) NOT NULL,
    trip_ids UUID[],
    
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: facility_payment_disputes
-- Tracks payment disputes and resolution
CREATE TABLE IF NOT EXISTS facility_payment_disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES facility_invoices(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES facility_invoice_payments(id) ON DELETE SET NULL,
    
    -- Dispute details
    dispute_reason TEXT NOT NULL,
    disputed_by_role VARCHAR(50) NOT NULL CHECK (disputed_by_role IN ('facility', 'dispatcher', 'admin')),
    disputed_by_user_id UUID NOT NULL,
    
    -- Resolution
    resolution_status VARCHAR(50) DEFAULT 'open' CHECK (resolution_status IN (
        'open', 'resolved', 'escalated'
    )),
    resolution_notes TEXT,
    resolved_by_user_id UUID,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment verification audit log table
CREATE TABLE IF NOT EXISTS payment_verification_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES facility_invoices(id) ON DELETE CASCADE,
    
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    performed_by_user_id UUID NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL CHECK (performed_by_role IN ('facility', 'dispatcher', 'admin')),
    
    notes TEXT,
    verification_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment settings table for system-wide payment configuration
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    check_payable_to VARCHAR(255) DEFAULT 'Compassionate Care Transportation',
    check_mailing_address TEXT DEFAULT '123 Main Street, City, State 12345',
    
    stripe_webhook_endpoint_secret VARCHAR(255),
    payment_processing_fee_percentage DECIMAL(5,4) DEFAULT 0.029,
    payment_processing_fee_fixed DECIMAL(10,2) DEFAULT 0.30,
    
    invoice_due_days INTEGER DEFAULT 30,
    late_fee_percentage DECIMAL(5,4) DEFAULT 0.015,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: ADD COLUMNS TO EXISTING TABLES

-- Add Stripe customer ID to facilities table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facilities' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE facilities ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
    END IF;
END $$;

-- Add default payment method tracking to facilities table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facilities' AND column_name = 'default_payment_method_id') THEN
        ALTER TABLE facilities ADD COLUMN default_payment_method_id UUID REFERENCES facility_payment_methods(id) ON DELETE SET NULL;
    END IF;
END $$;

-- STEP 3: CREATE INDEXES FOR PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_facility_payment_methods_facility_id ON facility_payment_methods(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_payment_methods_default ON facility_payment_methods(facility_id, is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_facility_invoices_facility_month ON facility_invoices(facility_id, month);
CREATE INDEX IF NOT EXISTS idx_facility_invoices_status ON facility_invoices(payment_status);

CREATE INDEX IF NOT EXISTS idx_facility_invoice_payments_facility_id ON facility_invoice_payments(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_invoice_payments_month ON facility_invoice_payments(facility_id, month);

CREATE INDEX IF NOT EXISTS idx_facility_payment_disputes_facility_id ON facility_payment_disputes(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_payment_disputes_status ON facility_payment_disputes(resolution_status);

CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_log_facility_id ON payment_verification_audit_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_log_invoice_id ON payment_verification_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_log_created_at ON payment_verification_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_facilities_default_payment_method ON facilities(default_payment_method_id) WHERE default_payment_method_id IS NOT NULL;

-- STEP 4: INSERT DEFAULT DATA

-- Insert default payment settings
INSERT INTO payment_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM payment_settings);

-- STEP 5: CREATE FUNCTIONS

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to ensure only one default payment method per facility
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        -- Remove default from all other payment methods for this facility
        UPDATE facility_payment_methods 
        SET is_default = FALSE 
        WHERE facility_id = NEW.facility_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- STEP 6: CREATE TRIGGERS

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_facility_payment_methods_updated_at ON facility_payment_methods;
CREATE TRIGGER update_facility_payment_methods_updated_at 
    BEFORE UPDATE ON facility_payment_methods 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_facility_invoices_updated_at ON facility_invoices;
CREATE TRIGGER update_facility_invoices_updated_at 
    BEFORE UPDATE ON facility_invoices 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_facility_payment_disputes_updated_at ON facility_payment_disputes;
CREATE TRIGGER update_facility_payment_disputes_updated_at 
    BEFORE UPDATE ON facility_payment_disputes 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_settings_updated_at ON payment_settings;
CREATE TRIGGER update_payment_settings_updated_at 
    BEFORE UPDATE ON payment_settings 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Trigger to ensure only one default payment method per facility
DROP TRIGGER IF EXISTS ensure_single_default_payment_method_trigger ON facility_payment_methods;
CREATE TRIGGER ensure_single_default_payment_method_trigger
    BEFORE INSERT OR UPDATE ON facility_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_payment_method();

-- STEP 7: ENABLE ROW LEVEL SECURITY (RLS)

-- RLS Policies for facility_payment_methods
ALTER TABLE facility_payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Facilities can manage their payment methods" ON facility_payment_methods;
DROP POLICY IF EXISTS "Dispatchers and admins can view all payment methods" ON facility_payment_methods;

-- Facilities can manage their own payment methods
CREATE POLICY "Facilities can manage their payment methods" ON facility_payment_methods
    FOR ALL USING (
        facility_id IN (
            SELECT facility_id FROM profiles 
            WHERE id = auth.uid() AND role = 'facility'
        )
    );
 
-- Dispatchers and admins can view all payment methods
CREATE POLICY "Dispatchers and admins can view all payment methods" ON facility_payment_methods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
        )
    );

-- RLS Policies for facility_invoices
ALTER TABLE facility_invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Facilities can manage their invoices" ON facility_invoices;
DROP POLICY IF EXISTS "Dispatchers and admins can manage all invoices" ON facility_invoices;

-- Facilities can manage their own invoices
CREATE POLICY "Facilities can manage their invoices" ON facility_invoices
    FOR ALL USING (
        facility_id IN (
            SELECT facility_id FROM profiles 
            WHERE id = auth.uid() AND role = 'facility'
        )
    );

-- Dispatchers and admins can manage all invoices
CREATE POLICY "Dispatchers and admins can manage all invoices" ON facility_invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
        )
    );

-- RLS Policies for facility_invoice_payments
ALTER TABLE facility_invoice_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Facilities can view their payment records" ON facility_invoice_payments;
DROP POLICY IF EXISTS "Facilities can create payment records" ON facility_invoice_payments;
DROP POLICY IF EXISTS "Dispatchers and admins can manage all payment records" ON facility_invoice_payments;

-- Facilities can view their own payment records
CREATE POLICY "Facilities can view their payment records" ON facility_invoice_payments
    FOR SELECT USING (
        facility_id IN (
            SELECT facility_id FROM profiles 
            WHERE id = auth.uid() AND role = 'facility'
        )
    );

-- Facilities can create payment records for their invoices
CREATE POLICY "Facilities can create payment records" ON facility_invoice_payments
    FOR INSERT WITH CHECK (
        facility_id IN (
            SELECT facility_id FROM profiles 
            WHERE id = auth.uid() AND role = 'facility'
        )
    );

-- Dispatchers and admins can manage all payment records
CREATE POLICY "Dispatchers and admins can manage all payment records" ON facility_invoice_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
        )
    );

-- RLS Policies for facility_payment_disputes
ALTER TABLE facility_payment_disputes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view related payment disputes" ON facility_payment_disputes;
DROP POLICY IF EXISTS "Facilities and dispatchers can create disputes" ON facility_payment_disputes;
DROP POLICY IF EXISTS "Dispatchers and admins can resolve disputes" ON facility_payment_disputes;

-- All authenticated users can view disputes for their associated facilities
CREATE POLICY "Users can view related payment disputes" ON facility_payment_disputes
    FOR SELECT USING (
        facility_id IN (
            SELECT facility_id FROM profiles 
            WHERE id = auth.uid() AND role = 'facility'
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
        )
    );

-- Facilities and dispatchers can create disputes
CREATE POLICY "Facilities and dispatchers can create disputes" ON facility_payment_disputes
    FOR INSERT WITH CHECK (
        (
            facility_id IN (
                SELECT facility_id FROM profiles 
                WHERE id = auth.uid() AND role = 'facility'
            )
            AND disputed_by_role = 'facility'
        )
        OR
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
            )
            AND disputed_by_role IN ('dispatcher', 'admin')
        )
    );

-- Dispatchers and admins can update dispute resolutions
CREATE POLICY "Dispatchers and admins can resolve disputes" ON facility_payment_disputes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
        )
    );

-- RLS Policies for payment_verification_audit_log
ALTER TABLE payment_verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Facilities can view their audit logs" ON payment_verification_audit_log;
DROP POLICY IF EXISTS "Dispatchers and admins can view all audit logs" ON payment_verification_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON payment_verification_audit_log;

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage payment settings" ON payment_settings;
DROP POLICY IF EXISTS "Everyone can read payment settings" ON payment_settings;

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

-- STEP 8: CREATE VIEWS

-- View for dispatcher payment verification dashboard
DROP VIEW IF EXISTS dispatcher_payment_verification_view;
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

-- Add table comments for documentation
COMMENT ON TABLE facility_payment_methods IS 'Stores saved payment methods for facilities including cards, bank accounts, and check details';
COMMENT ON TABLE facility_invoices IS 'Tracks monthly facility invoices with comprehensive payment status tracking';
COMMENT ON TABLE facility_invoice_payments IS 'Records individual payment transactions for facility invoices';
COMMENT ON TABLE facility_payment_disputes IS 'Tracks payment disputes and their resolution status';
COMMENT ON TABLE payment_verification_audit_log IS 'Audit trail for all payment status changes and verifications';
COMMENT ON TABLE payment_settings IS 'System-wide payment processing configuration';
COMMENT ON FUNCTION update_payment_status_with_audit(UUID, VARCHAR, UUID, VARCHAR, TEXT, TEXT) IS 'Updates payment status with automatic audit logging';
COMMENT ON FUNCTION set_default_payment_method(UUID, UUID) IS 'Sets default payment method for a facility';
COMMENT ON VIEW dispatcher_payment_verification_view IS 'Comprehensive view for dispatcher payment verification dashboard';11