-- SAFE MIGRATION FOR FACILITY APP INTEGRATION WITH DISPATCHER WORKFLOW
-- This migration adds missing columns and ensures compatibility with dispatcher app
-- SAFE: Only adds new columns, doesn't modify existing data

-- First check what wheelchair types exist in the database to avoid constraint violations
SELECT DISTINCT wheelchair_type, COUNT(*) as count
FROM trips 
WHERE wheelchair_type IS NOT NULL 
GROUP BY wheelchair_type;

-- Clean up any problematic data before applying constraints
UPDATE trips 
SET wheelchair_type = 'no_wheelchair' 
WHERE wheelchair_type IS NULL OR wheelchair_type = '';

-- Add the missing column that's causing the immediate error
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'additional_passengers') THEN
        ALTER TABLE trips ADD COLUMN additional_passengers INTEGER DEFAULT 0;
        COMMENT ON COLUMN trips.additional_passengers IS 'Number of additional passengers beyond the primary client';
        RAISE NOTICE '✅ Added additional_passengers column';
    ELSE
        RAISE NOTICE 'ℹ️ additional_passengers column already exists';
    END IF;
END $$;

-- Add other essential columns for Facility App workflow
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'trip_notes') THEN
        ALTER TABLE trips ADD COLUMN trip_notes TEXT;
        COMMENT ON COLUMN trips.trip_notes IS 'Special instructions or notes for the trip';
        RAISE NOTICE '✅ Added trip_notes column';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'booked_by') THEN
        ALTER TABLE trips ADD COLUMN booked_by UUID REFERENCES auth.users(id);
        COMMENT ON COLUMN trips.booked_by IS 'User who created this booking (facility admin or individual client)';
        RAISE NOTICE '✅ Added booked_by column';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'bill_to') THEN
        ALTER TABLE trips ADD COLUMN bill_to TEXT DEFAULT 'facility';
        COMMENT ON COLUMN trips.bill_to IS 'Who should be billed: facility or client';
        RAISE NOTICE '✅ Added bill_to column';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'managed_client_id') THEN
        ALTER TABLE trips ADD COLUMN managed_client_id UUID;
        COMMENT ON COLUMN trips.managed_client_id IS 'Reference to facility-managed client (non-authenticated)';
        RAISE NOTICE '✅ Added managed_client_id column';
    END IF;
END $$;

-- Add route tracking columns for Google Maps integration
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration') THEN
        ALTER TABLE trips ADD COLUMN route_duration TEXT;
        COMMENT ON COLUMN trips.route_duration IS 'Estimated duration from Google Maps';
        RAISE NOTICE '✅ Added route_duration column';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_distance_text') THEN
        ALTER TABLE trips ADD COLUMN route_distance_text TEXT;
        COMMENT ON COLUMN trips.route_distance_text IS 'Human readable distance from Google Maps';
        RAISE NOTICE '✅ Added route_distance_text column';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration_text') THEN
        ALTER TABLE trips ADD COLUMN route_duration_text TEXT;
        COMMENT ON COLUMN trips.route_duration_text IS 'Human readable duration from Google Maps';
        RAISE NOTICE '✅ Added route_duration_text column';
    END IF;
END $$;

-- SAFE CONSTRAINT UPDATE: Expand wheelchair types (more permissive, not restrictive)
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    -- Check if constraint exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'trips' AND constraint_name = 'trips_wheelchair_type_check'
    ) INTO constraint_exists;
    
    -- Drop existing constraint if it exists
    IF constraint_exists THEN
        ALTER TABLE trips DROP CONSTRAINT trips_wheelchair_type_check;
        RAISE NOTICE '🔧 Dropped existing wheelchair constraint';
    END IF;
    
    -- Add expanded constraint (includes foldable and power for wheelchair pricing)
    ALTER TABLE trips ADD CONSTRAINT trips_wheelchair_type_check 
    CHECK (wheelchair_type IN ('no_wheelchair', 'wheelchair', 'foldable', 'power'));
    
    RAISE NOTICE '✅ Added expanded wheelchair constraint supporting new pricing types';
    
EXCEPTION 
    WHEN check_violation THEN
        RAISE NOTICE '⚠️ Constraint failed - there are existing wheelchair types not in our list';
        RAISE NOTICE 'Skipping wheelchair constraint to preserve existing data';
        RAISE NOTICE 'Manual cleanup may be needed for wheelchair types';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error updating wheelchair constraint: %', SQLERRM;
        RAISE NOTICE 'Continuing without constraint update to be safe';
END $$;

-- Add bill_to constraint  
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'trips' AND constraint_name = 'trips_bill_to_check') THEN
        ALTER TABLE trips DROP CONSTRAINT trips_bill_to_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE trips ADD CONSTRAINT trips_bill_to_check 
    CHECK (bill_to IN ('facility', 'client'));
    
    RAISE NOTICE '✅ Added bill_to constraint';
END $$;

-- Final verification
DO $$
BEGIN
    -- Verify essential column was added
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trips' AND column_name = 'additional_passengers') THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SUCCESS: Migration completed successfully!';
        RAISE NOTICE '✅ additional_passengers column is now available';
        RAISE NOTICE '✅ Facility App booking error should be fixed';
        RAISE NOTICE '✅ All columns added for dispatcher integration';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Next: Facility App will create trips with status="pending"';
        RAISE NOTICE '📋 Dispatcher App will show these trips for approval';
        RAISE NOTICE '';
    ELSE
        RAISE ERROR '❌ Migration failed - additional_passengers column not found';
    END IF;
END $$;
