-- IMMEDIATE FIX: Link existing trips to facility billing
-- Run this in Supabase SQL Editor

-- Step 1: Find the user who created the trips
SELECT DISTINCT 
  p.id as user_id,
  p.email,
  p.facility_id,
  p.role,
  COUNT(t.id) as trip_count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
GROUP BY p.id, p.email, p.facility_id, p.role;

-- Step 2: Find existing facilities
SELECT id, name, billing_email FROM facilities;

-- Step 3: OPTION A - Update the user to be a facility user
-- Replace 'ACTUAL_USER_EMAIL' with the email from Step 1
-- Replace 'ACTUAL_FACILITY_ID' with a facility ID from Step 2

/*
UPDATE profiles 
SET 
  facility_id = 'ACTUAL_FACILITY_ID',
  role = 'facility'
WHERE email = 'ACTUAL_USER_EMAIL';
*/

-- Step 4: OPTION B - Create a new facility user and transfer trips
-- First create the facility user account (if needed)
/*
INSERT INTO profiles (id, email, role, facility_id, first_name, last_name)
VALUES (
  gen_random_uuid(),
  'facility_test@compassionatecaretransportation.com',
  'facility',
  'ACTUAL_FACILITY_ID',
  'Facility',
  'Admin'
);
*/

-- Then transfer trips to the facility user
/*
UPDATE trips 
SET user_id = (
  SELECT id FROM profiles 
  WHERE email = 'facility_test@compassionatecaretransportation.com' 
  AND role = 'facility'
)
WHERE pickup_time >= '2025-06-01' 
  AND pickup_time < '2025-07-01';
*/

-- Step 5: Verify the fix
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.status,
  p.email,
  p.facility_id,
  p.role
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC;
