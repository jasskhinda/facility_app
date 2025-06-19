-- SAFE COMPLETE FIX: Add all missing columns for Facility App booking
-- This adds only the columns your StreamlinedBookingForm actually uses
-- 100% safe for multi-app ecosystem

-- Add all missing columns that the booking form needs
DO $$ 
BEGIN
    -- trip_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'trip_notes') THEN
        ALTER TABLE trips ADD COLUMN trip_notes TEXT;
        RAISE NOTICE '✅ Added trip_notes column';
    END IF;

    -- booked_by column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'booked_by') THEN
        ALTER TABLE trips ADD COLUMN booked_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added booked_by column';
    END IF;

    -- managed_client_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'managed_client_id') THEN
        ALTER TABLE trips ADD COLUMN managed_client_id UUID;
        RAISE NOTICE '✅ Added managed_client_id column';
    END IF;

    -- pickup_details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pickup_details') THEN
        ALTER TABLE trips ADD COLUMN pickup_details TEXT;
        RAISE NOTICE '✅ Added pickup_details column';
    END IF;

    -- destination_details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'destination_details') THEN
        ALTER TABLE trips ADD COLUMN destination_details TEXT;
        RAISE NOTICE '✅ Added destination_details column';
    END IF;

    -- route_duration column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration') THEN
        ALTER TABLE trips ADD COLUMN route_duration TEXT;
        RAISE NOTICE '✅ Added route_duration column';
    END IF;

    -- route_distance_text column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_distance_text') THEN
        ALTER TABLE trips ADD COLUMN route_distance_text TEXT;
        RAISE NOTICE '✅ Added route_distance_text column';
    END IF;

    -- route_duration_text column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration_text') THEN
        ALTER TABLE trips ADD COLUMN route_duration_text TEXT;
        RAISE NOTICE '✅ Added route_duration_text column';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL MISSING COLUMNS ADDED SUCCESSFULLY!';
    RAISE NOTICE '✅ Facility App booking should now work completely';
    RAISE NOTICE '✅ All other apps remain unaffected';
    RAISE NOTICE '';
END $$;
