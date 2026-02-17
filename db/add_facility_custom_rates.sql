-- Migration script to add custom rates support for facilities
-- This allows admins to set custom pricing rates per facility

-- Create facility_custom_rates table
CREATE TABLE IF NOT EXISTS facility_custom_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

  -- Base rates (override PRICING_CONFIG.BASE_RATES)
  base_rate_regular DECIMAL(10,2),          -- Default: $50 per leg
  base_rate_bariatric DECIMAL(10,2),        -- Default: $150 per leg

  -- Distance rates (override PRICING_CONFIG.DISTANCE)
  per_mile_franklin DECIMAL(10,2),          -- Default: $3/mile in Franklin County
  per_mile_outside DECIMAL(10,2),           -- Default: $4/mile outside Franklin County
  dead_mileage_rate DECIMAL(10,2),          -- Default: $4/mile for dead mileage

  -- Premium rates (override PRICING_CONFIG.PREMIUMS)
  weekend_after_hours_fee DECIMAL(10,2),    -- Default: $40
  emergency_fee DECIMAL(10,2),              -- Default: $40
  holiday_surcharge DECIMAL(10,2),          -- Default: $100
  county_surcharge DECIMAL(10,2),           -- Default: $50 per county

  -- Discount rates (override PRICING_CONFIG.DISCOUNTS)
  veteran_discount_percent DECIMAL(5,2),    -- Default: 20%

  -- Meta
  is_active BOOLEAN DEFAULT true,
  notes TEXT,                               -- Admin notes about why custom rates were set
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Create unique index to ensure one active rate per facility
CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_custom_rates_active
ON facility_custom_rates(facility_id)
WHERE is_active = true;

-- Create trigger for updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        DROP TRIGGER IF EXISTS update_facility_custom_rates_updated_at ON facility_custom_rates;
        CREATE TRIGGER update_facility_custom_rates_updated_at
        BEFORE UPDATE ON facility_custom_rates
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS for facility_custom_rates
ALTER TABLE facility_custom_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage custom rates" ON facility_custom_rates;
DROP POLICY IF EXISTS "Facility users can view their own custom rates" ON facility_custom_rates;

-- Admins can do everything with custom rates
CREATE POLICY "Admins can manage custom rates"
ON facility_custom_rates FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Facility users can view their own custom rates (read-only)
CREATE POLICY "Facility users can view their own custom rates"
ON facility_custom_rates FOR SELECT
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Add has_custom_rates column to facilities table for quick lookup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'facilities' AND column_name = 'has_custom_rates') THEN
        ALTER TABLE facilities ADD COLUMN has_custom_rates BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create a function to update has_custom_rates flag on facilities table
CREATE OR REPLACE FUNCTION update_facility_custom_rates_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE facilities
    SET has_custom_rates = EXISTS (
      SELECT 1 FROM facility_custom_rates
      WHERE facility_id = NEW.facility_id AND is_active = true
    )
    WHERE id = NEW.facility_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE facilities
    SET has_custom_rates = EXISTS (
      SELECT 1 FROM facility_custom_rates
      WHERE facility_id = OLD.facility_id AND is_active = true
    )
    WHERE id = OLD.facility_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update has_custom_rates flag
DROP TRIGGER IF EXISTS trigger_update_facility_custom_rates_flag ON facility_custom_rates;
CREATE TRIGGER trigger_update_facility_custom_rates_flag
AFTER INSERT OR UPDATE OR DELETE ON facility_custom_rates
FOR EACH ROW
EXECUTE FUNCTION update_facility_custom_rates_flag();
