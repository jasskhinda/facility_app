-- URGENT: Check trip ownership and facility relationships
-- Run these queries in Supabase SQL Editor to diagnose the billing issue

-- 1. Check ALL trips from June 2025
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.status,
  t.user_id,
  p.email as user_email,
  p.facility_id,
  p.role as user_role
FROM trips t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC;

-- 2. Check what user is logged into the billing page
-- Look for users with role = 'facility'
SELECT id, email, facility_id, role, first_name, last_name 
FROM profiles 
WHERE role = 'facility' OR email LIKE '%facility%';

-- 3. Check if trips belong to facility users
SELECT 
  'FACILITY USERS' as category,
  COUNT(*) as count
FROM profiles 
WHERE facility_id IS NOT NULL;

SELECT 
  'TRIPS BY FACILITY USERS' as category,
  COUNT(*) as count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL;

-- 4. The REAL issue: Check if your trips belong to the facility
-- Replace 'your-user-email@example.com' with the actual user email from the trips
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
WHERE p.email = 'facility_test@compassionatecaretransportation.com'  -- Replace with actual user email
  AND t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01';

-- 5. SOLUTION: If trips exist but user has no facility_id, update the user
-- Find the facility ID first
SELECT id, name FROM facilities LIMIT 5;

-- Then update the user to be associated with a facility
-- UPDATE profiles 
-- SET 
--   facility_id = 'YOUR_FACILITY_ID_HERE',
--   role = 'facility'
-- WHERE email = 'your-actual-user-email@example.com';

-- 6. Alternative: Create trips for an existing facility user
-- If facility users exist but have no trips, create trips for them
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip)
SELECT 
  p.id,
  '123 Hospital Way, Medical City',
  '456 Patient Home St, Hometown',
  '2025-06-15T10:00:00Z',
  'completed',
  45.50,
  'no_wheelchair',
  false
FROM profiles p 
WHERE p.facility_id IS NOT NULL 
  AND p.role = 'facility'
LIMIT 1;
