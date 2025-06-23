-- BILLING DATA FIX - SQL VERSION
-- Execute this in Supabase SQL Editor if browser console doesn't work

-- Step 1: Ensure we have a facility
INSERT INTO facilities (id, name, billing_email, address, phone_number, status, contact_email, facility_type)
VALUES (
  1,
  'Healthcare Facility',
  'billing@healthcare.com',
  '123 Medical Dr, Healthcare City, State 12345',
  '(555) 123-4567',
  'active',
  'contact@healthcare.com',
  'healthcare'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  billing_email = EXCLUDED.billing_email;

-- Step 2: Create facility clients (users with role='facility')
INSERT INTO profiles (
  id,
  first_name,
  last_name,
  email,
  facility_id,
  role,
  status,
  client_type,
  phone_number,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'John',
  'Smith',
  'john.smith.facility@healthcare.com',
  1,
  'facility',
  'active',
  'facility',
  '(555) 100-0001',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Sarah',
  'Johnson',
  'sarah.johnson.facility@healthcare.com',
  1,
  'facility',
  'active',
  'facility',
  '(555) 100-0002',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Michael',
  'Davis',
  'michael.davis.facility@healthcare.com',
  1,
  'facility',
  'active',
  'facility',
  '(555) 100-0003',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Step 3: Create June 2025 trips for billing
INSERT INTO trips (
  id,
  user_id,
  pickup_address,
  destination_address,
  pickup_time,
  price,
  wheelchair_type,
  is_round_trip,
  additional_passengers,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  p.id,
  CASE 
    WHEN p.first_name = 'John' THEN '123 Medical Center Dr, Healthcare City, State 12345'
    WHEN p.first_name = 'Sarah' THEN '555 Senior Center Way, Healthcare City, State 12345'
    ELSE '999 Care Facility Dr, Healthcare City, State 12345'
  END,
  CASE 
    WHEN p.first_name = 'John' THEN '456 Hospital Ave, Healthcare City, State 12345'
    WHEN p.first_name = 'Sarah' THEN '888 Specialist Clinic Dr, Healthcare City, State 12345'
    ELSE '111 Diagnostic Center Ave, Healthcare City, State 12345'
  END,
  CASE 
    WHEN p.first_name = 'John' THEN '2025-06-15 09:30:00+00'::timestamptz
    WHEN p.first_name = 'Sarah' THEN '2025-06-22 11:00:00+00'::timestamptz
    ELSE '2025-06-25 13:45:00+00'::timestamptz
  END,
  CASE 
    WHEN p.first_name = 'John' THEN 45.50
    WHEN p.first_name = 'Sarah' THEN 38.25
    ELSE 52.00
  END,
  CASE 
    WHEN p.first_name = 'John' THEN 'none'
    WHEN p.first_name = 'Sarah' THEN 'personal'
    ELSE 'provided'
  END,
  CASE 
    WHEN p.first_name = 'Sarah' THEN false
    ELSE false
  END,
  CASE 
    WHEN p.first_name = 'Michael' THEN 0
    WHEN p.first_name = 'Sarah' THEN 2
    ELSE 0
  END,
  'completed',
  NOW(),
  NOW()
FROM profiles p
WHERE p.facility_id = 1 
  AND p.role = 'facility'
  AND p.first_name IN ('John', 'Sarah', 'Michael')
ON CONFLICT DO NOTHING;

-- Add one more trip for John to make it more realistic
INSERT INTO trips (
  id,
  user_id,
  pickup_address,
  destination_address,
  pickup_time,
  price,
  wheelchair_type,
  is_round_trip,
  additional_passengers,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  p.id,
  '789 Therapy Center Blvd, Healthcare City, State 12345',
  '321 Rehab Facility St, Healthcare City, State 12345',
  '2025-06-18 14:15:00+00'::timestamptz,
  62.75,
  'provided',
  true,
  1,
  'completed',
  NOW(),
  NOW()
FROM profiles p
WHERE p.facility_id = 1 
  AND p.role = 'facility'
  AND p.first_name = 'John'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Step 4: Verification query
SELECT 
  'VERIFICATION RESULTS' as section,
  COUNT(*) as facility_count
FROM facilities 
WHERE id = 1;

SELECT 
  'FACILITY USERS' as section,
  COUNT(*) as user_count
FROM profiles 
WHERE facility_id = 1 AND role = 'facility';

SELECT 
  'JUNE 2025 TRIPS' as section,
  COUNT(*) as trip_count,
  SUM(price) as total_amount
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 1 
  AND p.role = 'facility'
  AND t.pickup_time >= '2025-06-01'
  AND t.pickup_time <= '2025-06-30';

-- Detailed trip listing for verification
SELECT 
  t.pickup_time::date as trip_date,
  p.first_name,
  p.last_name,
  t.price,
  t.status,
  f.name as facility_name
FROM trips t
JOIN profiles p ON t.user_id = p.id
JOIN facilities f ON p.facility_id = f.id
WHERE p.facility_id = 1 
  AND p.role = 'facility'
  AND t.pickup_time >= '2025-06-01'
  AND t.pickup_time <= '2025-06-30'
ORDER BY t.pickup_time;
