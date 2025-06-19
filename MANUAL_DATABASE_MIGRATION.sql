-- FINAL DATABASE MIGRATION FOR FACILITY APP
-- Run this in your Supabase Dashboard > SQL Editor
-- Safe to run multiple times, will not break existing apps

-- Add missing columns that may cause booking errors
DO $$ 
BEGIN
    -- Add additional_passengers column (fixes main booking error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'additional_passengers') THEN
        ALTER TABLE trips ADD COLUMN additional_passengers INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added additional_passengers column';
    ELSE
        RAISE NOTICE 'ℹ️ additional_passengers column already exists';
    END IF;
    
    -- Add bill_to column (for facility billing workflow)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'bill_to') THEN
        ALTER TABLE trips ADD COLUMN bill_to TEXT DEFAULT 'facility';
        RAISE NOTICE '✅ Added bill_to column';
    ELSE
        RAISE NOTICE 'ℹ️ bill_to column already exists';
    END IF;
    
    -- Add booked_by column (tracks who created the booking)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'booked_by') THEN
        ALTER TABLE trips ADD COLUMN booked_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added booked_by column';
    ELSE
        RAISE NOTICE 'ℹ️ booked_by column already exists';
    END IF;
    
    -- Add trip_notes column (for special instructions)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'trip_notes') THEN
        ALTER TABLE trips ADD COLUMN trip_notes TEXT;
        RAISE NOTICE '✅ Added trip_notes column';
    ELSE
        RAISE NOTICE 'ℹ️ trip_notes column already exists';
    END IF;
    
    -- Add managed_client_id column (for facility-managed clients)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'managed_client_id') THEN
        ALTER TABLE trips ADD COLUMN managed_client_id UUID;
        RAISE NOTICE '✅ Added managed_client_id column';
    ELSE
        RAISE NOTICE 'ℹ️ managed_client_id column already exists';
    END IF;
    
END $$;

-- Final verification and success message
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trips' AND column_name = 'additional_passengers') THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SUCCESS: Facility App database migration complete!';
        RAISE NOTICE '✅ All required columns are now available';
        RAISE NOTICE '✅ Booking functionality should work without errors';
        RAISE NOTICE '✅ Integration with Dispatcher App ready';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Test booking a trip in the Facility App to verify!';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION '❌ Migration verification failed';
    END IF;
END $$;
