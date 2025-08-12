-- Migration script to transition existing facilities to the new user management system
-- Run this after deploying the new facility_users table structure

-- Step 1: Create facility_users entries for existing facility profiles
INSERT INTO facility_users (facility_id, user_id, role, status, invited_at, created_at)
SELECT 
  p.facility_id,
  p.id as user_id,
  'super_admin' as role,  -- Existing facility users become super admins
  'active' as status,
  p.created_at as invited_at,
  NOW() as created_at
FROM profiles p
WHERE p.role = 'facility' 
  AND p.facility_id IS NOT NULL
  AND NOT EXISTS (
    -- Don't duplicate if already exists
    SELECT 1 FROM facility_users fu 
    WHERE fu.facility_id = p.facility_id 
    AND fu.user_id = p.id
  );

-- Step 2: Update any existing RLS policies that might conflict
-- (The new policies in the main schema file will take precedence)

-- Step 3: Verify the migration
-- Check that all facility users have been migrated
SELECT 
  f.name as facility_name,
  COUNT(fu.id) as user_count,
  STRING_AGG(fu.role, ', ') as roles
FROM facilities f
LEFT JOIN facility_users fu ON f.id = fu.facility_id
WHERE fu.status = 'active'
GROUP BY f.id, f.name
ORDER BY f.name;

-- Step 4: Optional - Add sample contracts for existing facilities
-- (Uncomment if you want to add placeholder contracts)
/*
INSERT INTO facility_contracts (facility_id, contract_name, contract_url, contract_type, uploaded_by, is_active)
SELECT 
  f.id as facility_id,
  'Service Agreement - ' || f.name as contract_name,
  'https://example.com/contracts/sample-service-agreement.pdf' as contract_url,
  'service_agreement' as contract_type,
  fu.user_id as uploaded_by,
  true as is_active
FROM facilities f
JOIN facility_users fu ON f.id = fu.facility_id
WHERE fu.role = 'super_admin' 
  AND fu.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM facility_contracts fc 
    WHERE fc.facility_id = f.id
  );
*/

-- Step 5: Create indexes for better performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_facility_users_lookup ON facility_users(facility_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_facility_users_role_status ON facility_users(role, status);

-- Step 6: Verification queries to run after migration
-- Uncomment these to check the migration results:

/*
-- Check facility user counts
SELECT 
  'Total facilities' as metric,
  COUNT(*) as count
FROM facilities
UNION ALL
SELECT 
  'Facilities with users' as metric,
  COUNT(DISTINCT facility_id) as count
FROM facility_users
WHERE status = 'active'
UNION ALL
SELECT 
  'Total facility users' as metric,
  COUNT(*) as count
FROM facility_users
WHERE status = 'active'
UNION ALL
SELECT 
  'Super admins' as metric,
  COUNT(*) as count
FROM facility_users
WHERE role = 'super_admin' AND status = 'active';

-- Check for any facilities without users (potential issues)
SELECT 
  f.id,
  f.name,
  'No active users' as issue
FROM facilities f
LEFT JOIN facility_users fu ON f.id = fu.facility_id AND fu.status = 'active'
WHERE fu.id IS NULL;

-- Check user role distribution
SELECT 
  role,
  COUNT(*) as user_count,
  COUNT(DISTINCT facility_id) as facility_count
FROM facility_users
WHERE status = 'active'
GROUP BY role
ORDER BY role;
*/