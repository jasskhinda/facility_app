-- SUPPLEMENTAL DATABASE MIGRATION - ADD REMAINING COLUMNS
-- Run this in your Supabase Dashboard > SQL Editor
-- This adds the columns that were missing from the first migration

DO $$ 
BEGIN
    -- Add pickup_details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pickup_details') THEN
        ALTER TABLE trips ADD COLUMN pickup_details TEXT;
        RAISE NOTICE '✅ Added pickup_details column';
    ELSE
        RAISE NOTICE 'ℹ️ pickup_details column already exists';
    END IF;
    
    -- Add destination_details column (this is causing the current error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'destination_details') THEN
        ALTER TABLE trips ADD COLUMN destination_details TEXT;
        RAISE NOTICE '✅ Added destination_details column';
    ELSE
        RAISE NOTICE 'ℹ️ destination_details column already exists';
    END IF;
    
    -- Add route tracking columns for Google Maps integration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration') THEN
        ALTER TABLE trips ADD COLUMN route_duration TEXT;
        RAISE NOTICE '✅ Added route_duration column';
    ELSE
        RAISE NOTICE 'ℹ️ route_duration column already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_distance_text') THEN
        ALTER TABLE trips ADD COLUMN route_distance_text TEXT;
        RAISE NOTICE '✅ Added route_distance_text column';
    ELSE
        RAISE NOTICE 'ℹ️ route_distance_text column already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration_text') THEN
        ALTER TABLE trips ADD COLUMN route_duration_text TEXT;
        RAISE NOTICE '✅ Added route_duration_text column';
    ELSE
        RAISE NOTICE 'ℹ️ route_duration_text column already exists';
    END IF;
    
END $$;

-- Final verification
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trips' AND column_name = 'destination_details') THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SUCCESS: All missing columns added!';
        RAISE NOTICE '✅ destination_details column error should be fixed';
        RAISE NOTICE '✅ Booking functionality should now work completely';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION '❌ destination_details column still missing';
    END IF;
END $$;
