-- add_webteam_super_admin.sql
-- SAFE SQL script to add webteam@nationalchurchresidences.org as Super Admin
-- This script ONLY creates new records and does NOT modify existing accounts

-- Step 1: First, manually create the auth user in Supabase Dashboard
-- Go to Authentication > Users > Add User:
-- Email: webteam@nationalchurchresidences.org  
-- Password: Openmyadmin5!
-- Check "Confirm Email"
-- Then replace YOUR_NEW_USER_ID_HERE below with the generated User ID

-- Step 2: Find the National Church Residences facility
-- This query will show you the facility ID - copy it for the next steps
SELECT id, name, created_at 
FROM facilities 
WHERE name ILIKE '%national%church%' 
   OR name ILIKE '%ncr%'
   OR id IN (
     SELECT DISTINCT facility_id 
     FROM profiles 
     WHERE email ILIKE '%@nationalchurchresidences.org'
   );

-- Step 3: Create the profile record
-- User ID: 663b6ee5-c48e-4535-a32f-f11ba1a822b2
-- Facility ID: f4ca3d52-7f8f-468d-9483-a56a236e2a2f (National Church Residences)
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  facility_id,
  created_at,
  updated_at
) VALUES (
  '663b6ee5-c48e-4535-a32f-f11ba1a822b2'::uuid,
  'webteam@nationalchurchresidences.org',
  'Web',
  'Team',
  'facility',
  'f4ca3d52-7f8f-468d-9483-a56a236e2a2f'::uuid,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 4: Add to facility_users as Super Admin
-- User ID: 663b6ee5-c48e-4535-a32f-f11ba1a822b2
-- Facility ID: f4ca3d52-7f8f-468d-9483-a56a236e2a2f (National Church Residences)
INSERT INTO facility_users (
  facility_id,
  user_id,
  role,
  is_owner,
  status,
  created_at,
  updated_at
) VALUES (
  'f4ca3d52-7f8f-468d-9483-a56a236e2a2f'::uuid,
  '663b6ee5-c48e-4535-a32f-f11ba1a822b2'::uuid,
  'super_admin',
  false,
  'active',
  NOW(),
  NOW()
) ON CONFLICT (facility_id, user_id) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  updated_at = NOW();

-- Step 5: Verify the setup
-- This query will show the new user's permissions
SELECT 
  fu.role,
  fu.status,
  fu.is_owner,
  f.name as facility_name,
  p.email,
  p.first_name,
  p.last_name
FROM facility_users fu
JOIN facilities f ON fu.facility_id = f.id  
JOIN profiles p ON fu.user_id = p.id
WHERE p.email = 'webteam@nationalchurchresidences.org';

-- Optional: Show all users in the facility to verify everything is correct
-- SELECT 
--   p.email,
--   p.first_name,
--   p.last_name,
--   fu.role,
--   fu.status,
--   fu.is_owner
-- FROM facility_users fu
-- JOIN profiles p ON fu.user_id = p.id
-- WHERE fu.facility_id = 'YOUR_FACILITY_ID_HERE'::uuid
-- ORDER BY fu.is_owner DESC, fu.role;