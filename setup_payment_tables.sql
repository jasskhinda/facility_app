-- Quick Setup Script for Facility Payment Methods
-- Run this in your Supabase SQL Editor

-- 1. Create the facility_payment_methods table
CREATE TABLE IF NOT EXISTS facility_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL,
    
    -- Stripe integration
    stripe_payment_method_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Payment method type
    payment_method_type VARCHAR(50) NOT NULL CHECK (payment_method_type IN ('card', 'bank_transfer')),
    
    -- Card details (for display purposes only)
    card_brand VARCHAR(50),
    last_four VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    cardholder_name VARCHAR(255),
    
    -- Bank account details (for display purposes only)
    bank_account_last_four VARCHAR(4),
    bank_routing_number VARCHAR(10),
    bank_account_holder_name VARCHAR(255),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('checking', 'savings')),
    
    -- Common fields
    nickname VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add stripe_customer_id to facilities table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facilities') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'facilities' AND column_name = 'stripe_customer_id') THEN
            ALTER TABLE facilities ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
        END IF;
    END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facility_payment_methods_facility_id ON facility_payment_methods(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_payment_methods_default ON facility_payment_methods(facility_id, is_default) WHERE is_default = TRUE;

-- 4. Enable RLS
ALTER TABLE facility_payment_methods ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Facilities can manage their payment methods" ON facility_payment_methods;
DROP POLICY IF EXISTS "Dispatchers and admins can view all payment methods" ON facility_payment_methods;

-- Create new policies
CREATE POLICY "Facilities can manage their payment methods" ON facility_payment_methods
    FOR ALL USING (
        facility_id::text IN (
            SELECT facility_id::text FROM profiles 
            WHERE id = auth.uid() AND role = 'facility'
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
        )
    );

-- 6. Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_facility_payment_methods_updated_at ON facility_payment_methods;
CREATE TRIGGER update_facility_payment_methods_updated_at 
    BEFORE UPDATE ON facility_payment_methods 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Create function to ensure only one default payment method per facility
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE facility_payment_methods 
        SET is_default = FALSE 
        WHERE facility_id = NEW.facility_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to ensure only one default payment method per facility
DROP TRIGGER IF EXISTS ensure_single_default_payment_method_trigger ON facility_payment_methods;
CREATE TRIGGER ensure_single_default_payment_method_trigger
    BEFORE INSERT OR UPDATE ON facility_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_payment_method();

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'facility_payment_methods table and related infrastructure created successfully!';
END $$;