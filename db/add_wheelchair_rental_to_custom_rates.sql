-- Migration script to add wheelchair_rental column to facility_custom_rates table
-- This allows admins to set custom wheelchair rental fees per facility

-- Add wheelchair_rental column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'facility_custom_rates' AND column_name = 'wheelchair_rental') THEN
        ALTER TABLE facility_custom_rates ADD COLUMN wheelchair_rental DECIMAL(10,2);
        COMMENT ON COLUMN facility_custom_rates.wheelchair_rental IS 'Custom wheelchair rental fee. Default: $25';
    END IF;
END $$;
