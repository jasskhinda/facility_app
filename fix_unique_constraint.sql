-- Fix the unique constraint issue in facility_payment_methods table
-- The current constraint prevents multiple FALSE values, which is incorrect

-- First, drop the problematic constraint
ALTER TABLE facility_payment_methods DROP CONSTRAINT IF EXISTS unique_default_per_facility;

-- Create a proper partial unique index that only enforces uniqueness on TRUE values
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_per_facility_true 
ON facility_payment_methods (facility_id) 
WHERE is_default = TRUE;

-- This allows multiple FALSE values but only one TRUE value per facility_id