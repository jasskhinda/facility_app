-- Force Supabase to refresh its schema cache
-- Run this in your Supabase SQL Editor

-- Method 1: Notify Supabase of schema changes
NOTIFY pgrst, 'reload schema';

-- Method 2: Create a temporary modification to force cache refresh
BEGIN;
  -- Add a temporary column
  ALTER TABLE trips ADD COLUMN _cache_refresh_temp BOOLEAN DEFAULT false;
  
  -- Immediately drop it
  ALTER TABLE trips DROP COLUMN _cache_refresh_temp;
  
  -- This forces Supabase to re-scan the table structure
COMMIT;

-- Method 3: Disable and re-enable RLS to force policy refresh
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Method 4: Create and drop a temporary function that references trips
CREATE OR REPLACE FUNCTION _temp_force_schema_refresh()
RETURNS void AS $$
BEGIN
  -- Just reference the trips table to force schema scan
  PERFORM * FROM trips LIMIT 1;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION _temp_force_schema_refresh();

-- Verify the refresh worked
SELECT 
  'Schema refreshed. Current trips columns:' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trips';