-- Fix billing schema issues
-- This script adds missing columns needed for facility billing

-- Add missing columns to trips table
DO $$ 
BEGIN
    -- Add billable column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'billable') THEN
        ALTER TABLE trips ADD COLUMN billable BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added billable column to trips table';
    END IF;
    
    -- Add total_fare column if it doesn't exist (as alias for price)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'total_fare') THEN
        ALTER TABLE trips ADD COLUMN total_fare DECIMAL(10,2);
        RAISE NOTICE 'Added total_fare column to trips table';
    END IF;
    
    -- Add pickup_date column if it doesn't exist (for billing queries)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pickup_date') THEN
        ALTER TABLE trips ADD COLUMN pickup_date DATE;
        RAISE NOTICE 'Added pickup_date column to trips table';
    END IF;
END $$;

-- Update existing data to fix billing
UPDATE trips 
SET 
    billable = TRUE,
    total_fare = COALESCE(price, 0),
    pickup_date = DATE(pickup_time)
WHERE 
    status = 'completed' 
    AND (price > 0 OR distance > 0)
    AND facility_id IS NOT NULL;

-- Update trips that have been completed but don't have price set yet
-- This catches trips that went through the completion process but didn't get pricing
UPDATE trips 
SET 
    billable = TRUE,
    total_fare = CASE 
        WHEN distance IS NOT NULL AND distance > 0 THEN distance * 2.50  -- Base rate calculation
        ELSE 25.00  -- Minimum fare
    END,
    pickup_date = DATE(pickup_time)
WHERE 
    status = 'completed' 
    AND facility_id IS NOT NULL
    AND (price IS NULL OR price = 0)
    AND billable IS NOT TRUE;

-- Ensure all completed facility trips have pickup_date set
UPDATE trips 
SET pickup_date = DATE(pickup_time)
WHERE pickup_date IS NULL AND pickup_time IS NOT NULL;

-- Create index for better billing query performance
CREATE INDEX IF NOT EXISTS idx_trips_billing 
ON trips (facility_id, billable, pickup_date, status) 
WHERE billable = TRUE;

-- Verify the updates
SELECT 
    'Billing Fix Results' as summary,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE billable = TRUE) as billable_trips,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
    COUNT(*) FILTER (WHERE facility_id IS NOT NULL) as facility_trips,
    SUM(total_fare) FILTER (WHERE billable = TRUE) as total_billable_amount
FROM trips;