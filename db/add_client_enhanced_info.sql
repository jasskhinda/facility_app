-- Add enhanced client information fields to facility_managed_clients table
-- These fields are required for booking and bariatric rate calculations

ALTER TABLE facility_managed_clients
ADD COLUMN IF NOT EXISTS weight NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS height_feet INTEGER,
ADD COLUMN IF NOT EXISTS height_inches INTEGER,
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add comments to document the fields
COMMENT ON COLUMN facility_managed_clients.weight IS 'Client weight in pounds - required for bariatric rate calculation (>=300 lbs)';
COMMENT ON COLUMN facility_managed_clients.height_feet IS 'Client height in feet';
COMMENT ON COLUMN facility_managed_clients.height_inches IS 'Client height in inches';
COMMENT ON COLUMN facility_managed_clients.date_of_birth IS 'Client date of birth - required for hospital record verification';
