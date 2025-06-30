-- Facility Payment System Database Schema
-- This schema supports the comprehensive payment system for facilities

-- Table: facility_payment_methods
-- Stores saved payment methods for facilities
CREATE TABLE IF NOT EXISTS facility_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    
    -- Stripe integration
    stripe_payment_method_id VARCHAR(255), -- Stripe payment method ID
    stripe_customer_id VARCHAR(255), -- Stripe customer ID
    
    -- Payment method type
    payment_method_type VARCHAR(50) NOT NULL CHECK (payment_method_type IN ('card', 'bank_transfer')),
    
    -- Card details (for display purposes only)
    card_brand VARCHAR(50), -- visa, mastercard, amex, etc.
    last_four VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    cardholder_name VARCHAR(255),
    
    -- Bank account details (for display purposes only)
    bank_account_last_four VARCHAR(4),
    bank_routing_number VARCHAR(10), -- Encrypted in production
    bank_account_holder_name VARCHAR(255),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('checking', 'savings')),
    
    -- Common fields
    nickname VARCHAR(100), -- User-friendly name for the payment method
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
    
    -- Invoice details
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    month VARCHAR(7) NOT NULL, -- YYYY-MM format
    total_amount DECIMAL(10,2) NOT NULL,
    total_trips INTEGER DEFAULT 0,
    
    -- Payment status tracking
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN (
        'UNPAID',
        'PROCESSING PAYMENT',
        'PAID WITH CARD',
        'PAID',
        'PAID WITH CHECK (BEING VERIFIED)',
        'PAID WITH CHECK - VERIFIED',
        'PENDING',
        'NEEDS ATTENTION - RETRY PAYMENT'
    )),
    
    -- Associated data
    trip_ids UUID[], -- Array of trip IDs included in this invoice
    billing_email VARCHAR(255),
    
    -- Timestamps
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
    
    -- Payment method reference
    payment_method_id UUID REFERENCES facility_payment_methods(id) ON DELETE SET NULL,
    
    -- Transaction details
    stripe_payment_intent_id VARCHAR(255), -- For Stripe payments
    card_last_four VARCHAR(4),
    billing_name VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN (
        'pending', 'completed', 'failed', 'refunded'
    )),
    
    -- Associated data
    month VARCHAR(7) NOT NULL, -- YYYY-MM format
    trip_ids UUID[], -- Array of trip IDs covered by this payment
    
    -- Timestamps
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

-- Add Stripe customer ID to facilities table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facilities' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE facilities ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facility_payment_methods_facility_id ON facility_payment_methods(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_payment_methods_default ON facility_payment_methods(facility_id, is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_facility_invoices_facility_month ON facility_invoices(facility_id, month);
CREATE INDEX IF NOT EXISTS idx_facility_invoices_status ON facility_invoices(payment_status);

CREATE INDEX IF NOT EXISTS idx_facility_invoice_payments_facility_id ON facility_invoice_payments(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_invoice_payments_month ON facility_invoice_payments(facility_id, month);

CREATE INDEX IF NOT EXISTS idx_facility_payment_disputes_facility_id ON facility_payment_disputes(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_payment_disputes_status ON facility_payment_disputes(resolution_status);

-- RLS Policies for facility_payment_methods
ALTER TABLE facility_payment_methods ENABLE ROW LEVEL SECURITY;

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

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_facility_payment_methods_updated_at BEFORE UPDATE ON facility_payment_methods FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_facility_invoices_updated_at BEFORE UPDATE ON facility_invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_facility_payment_disputes_updated_at BEFORE UPDATE ON facility_payment_disputes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

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

-- Trigger to ensure only one default payment method per facility
CREATE TRIGGER ensure_single_default_payment_method_trigger
    BEFORE INSERT OR UPDATE ON facility_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_payment_method();