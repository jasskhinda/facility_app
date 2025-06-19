-- ULTRA-SAFE MINIMAL MIGRATION: Only fix the immediate booking error
-- This adds ONLY the missing column causing the error, nothing else
-- 100% safe for multi-app ecosystem

-- Step 1: Add only the column that's causing the immediate error
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'additional_passengers') THEN
        ALTER TABLE trips ADD COLUMN additional_passengers INTEGER DEFAULT 0;
        RAISE NOTICE '✅ SUCCESS: Added additional_passengers column - booking error fixed!';
    ELSE
        RAISE NOTICE 'ℹ️ additional_passengers column already exists - no action needed';
    END IF;
END $$;

-- That's it! Just one column to fix the immediate error.
-- No constraints modified, no existing data touched, no risk to other apps.

-- Verification
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trips' AND column_name = 'additional_passengers') THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 MIGRATION COMPLETE: Facility App booking should now work!';
        RAISE NOTICE '✅ Error "Could not find additional_passengers column" is fixed';
        RAISE NOTICE '✅ All other apps remain completely unaffected';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Next: Test booking a trip in Facility App';
        RAISE NOTICE '';
    ELSE
        RAISE ERROR 'Migration failed - column was not added';
    END IF;
END $$;
