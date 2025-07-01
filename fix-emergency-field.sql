-- Fix schema cache issue with is_emergency field
-- This script ensures the trips table doesn't have is_emergency column
-- and refreshes any cached schema references

-- First, check if the column exists and drop it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trips' 
        AND column_name = 'is_emergency'
    ) THEN
        ALTER TABLE trips DROP COLUMN is_emergency;
        RAISE NOTICE 'Dropped is_emergency column from trips table';
    ELSE
        RAISE NOTICE 'is_emergency column does not exist in trips table';
    END IF;
END $$;

-- Force schema cache refresh by adding and immediately dropping a dummy column
-- This helps Supabase refresh its internal schema cache
ALTER TABLE trips ADD COLUMN _temp_refresh_cache BOOLEAN DEFAULT false;
ALTER TABLE trips DROP COLUMN _temp_refresh_cache;

-- Verify the trips table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trips'
ORDER BY ordinal_position;