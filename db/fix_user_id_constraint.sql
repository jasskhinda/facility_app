-- FIX USER_ID NULL CONSTRAINT ISSUE FOR MANAGED CLIENTS
-- This migration allows user_id to be NULL for managed clients
-- SAFE: Only removes NOT NULL constraint, doesn't modify existing data

DO $$ 
BEGIN
    -- Remove NOT NULL constraint from user_id column to allow managed clients
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✅ Removed NOT NULL constraint from user_id column';
        RAISE NOTICE '📝 Managed clients can now have trips with NULL user_id';
    ELSE
        RAISE NOTICE 'ℹ️ user_id column already allows NULL values';
    END IF;
    
    -- Ensure managed_client_id column exists for non-authenticated clients
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'managed_client_id') THEN
        ALTER TABLE trips ADD COLUMN managed_client_id UUID;
        RAISE NOTICE '✅ Added managed_client_id column for non-authenticated clients';
    ELSE
        RAISE NOTICE 'ℹ️ managed_client_id column already exists';
    END IF;
    
    -- Add constraint to ensure either user_id or managed_client_id is set (but not both)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'trips' AND constraint_name = 'trips_client_reference_check'
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_client_reference_check 
        CHECK (
            (user_id IS NOT NULL AND managed_client_id IS NULL) OR 
            (user_id IS NULL AND managed_client_id IS NOT NULL)
        );
        RAISE NOTICE '✅ Added constraint ensuring proper client reference';
    ELSE
        RAISE NOTICE 'ℹ️ Client reference constraint already exists';
    END IF;
    
END $$;

-- Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'user_id' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SUCCESS: User ID constraint fix complete!';
        RAISE NOTICE '✅ Managed clients can now book trips with NULL user_id';
        RAISE NOTICE '✅ Database properly supports both authenticated and managed clients';
        RAISE NOTICE '✅ Facility App booking should now work without errors';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION '❌ Migration failed - user_id still has NOT NULL constraint';
    END IF;
END $$;
