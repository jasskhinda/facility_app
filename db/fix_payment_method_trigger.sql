-- Fix for payment method trigger issue
-- This script fixes the trigger that references non-existent 'last_edited_by' column

-- First, check if the problematic trigger exists and drop it
DROP TRIGGER IF EXISTS ensure_single_default_payment_method_trigger ON facility_payment_methods;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS ensure_single_default_payment_method();

-- Create a new, simplified function that doesn't reference non-existent columns
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if the new record is being set as default
    IF NEW.is_default = TRUE THEN
        -- Remove default from all other payment methods for this facility
        UPDATE facility_payment_methods 
        SET is_default = FALSE 
        WHERE facility_id = NEW.facility_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER ensure_single_default_payment_method_trigger
    BEFORE INSERT OR UPDATE ON facility_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_payment_method();

-- Also fix the set_default_payment_method function if it has issues
DROP FUNCTION IF EXISTS set_default_payment_method(UUID, UUID);

CREATE OR REPLACE FUNCTION set_default_payment_method(
    p_facility_id UUID,
    p_payment_method_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- First, remove default from all payment methods for this facility
    UPDATE facility_payment_methods 
    SET is_default = FALSE 
    WHERE facility_id = p_facility_id;
    
    -- Then set the specified payment method as default
    UPDATE facility_payment_methods 
    SET is_default = TRUE 
    WHERE id = p_payment_method_id AND facility_id = p_facility_id;
    
    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment method not found or access denied';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_default_payment_method(UUID, UUID) TO authenticated;