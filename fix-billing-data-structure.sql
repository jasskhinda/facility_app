-- Fix for billing data structure
-- This addresses the specific issue where billing component can't find facility users

-- Step 1: Check current database structure
SELECT 'FACILITIES:' as section;
SELECT id, name, status FROM facilities LIMIT 3;

SELECT 'PROFILES:' as section;
SELECT id, first_name, last_name, role, facility_id, client_type 
FROM profiles 
WHERE facility_id IS NOT NULL 
LIMIT 5;

SELECT 'TRIPS IN JUNE 2025:' as section;
SELECT id, user_id, pickup_time, price, status
FROM trips 
WHERE pickup_time >= '2025-06-01' 
  AND pickup_time <= '2025-06-30'
LIMIT 5;

-- Step 2: If no facility users exist, create proper structure
-- First ensure we have a facility
INSERT INTO facilities (id, name, billing_email, address, phone_number, status)
VALUES (
  '1', 
  'Main Healthcare Facility',
  'billing@mainhealthcare.com',
  '123 Medical Center Drive, Healthcare City, State 12345',
  '(555) 123-4567',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Create facility client profiles (these are the clients that belong to the facility)
INSERT INTO profiles (
  id,
  first_name,
  last_name,
  email,
  facility_id,
  role,
  status,
  client_type,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'John',
  'Smith',
  'john.smith.facility@example.com',
  '1',
  'facility',
  'active',
  'facility',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Sarah',
  'Johnson',
  'sarah.johnson.facility@example.com',
  '1',
  'facility',
  'active',
  'facility',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Michael',
  'Davis',
  'michael.davis.facility@example.com',
  '1',
  'facility',
  'active',
  'facility',
  NOW(),
  NOW()
);

-- Step 3: Create trips for these facility clients in June 2025
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
    WHEN p.first_name = 'Sarah' THEN '456 Therapy Center Blvd, Healthcare City, State 12345'
    ELSE '789 Senior Living Way, Healthcare City, State 12345'
  END,
  CASE 
    WHEN p.first_name = 'John' THEN '456 Hospital Ave, Healthcare City, State 12345'
    WHEN p.first_name = 'Sarah' THEN '321 Rehab Facility St, Healthcare City, State 12345'
    ELSE '888 Specialist Clinic Dr, Healthcare City, State 12345'
  END,
  CASE 
    WHEN p.first_name = 'John' THEN '2025-06-15 09:30:00+00'::timestamptz
    WHEN p.first_name = 'Sarah' THEN '2025-06-18 14:15:00+00'::timestamptz
    ELSE '2025-06-22 11:00:00+00'::timestamptz
  END,
  CASE 
    WHEN p.first_name = 'John' THEN 45.50
    WHEN p.first_name = 'Sarah' THEN 62.75
    ELSE 38.25
  END,
  CASE 
    WHEN p.first_name = 'John' THEN 'none'
    WHEN p.first_name = 'Sarah' THEN 'provided'
    ELSE 'personal'
  END,
  CASE 
    WHEN p.first_name = 'Sarah' THEN true
    ELSE false
  END,
  CASE 
    WHEN p.first_name = 'Michael' THEN 2
    WHEN p.first_name = 'Sarah' THEN 1
    ELSE 0
  END,
  'completed',
  NOW(),
  NOW()
FROM profiles p
WHERE p.facility_id = '1' 
  AND p.role = 'facility'
  AND p.first_name IN ('John', 'Sarah', 'Michael');

-- Step 4: Verify the data structure
SELECT 'VERIFICATION - FACILITY USERS:' as section;
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.role,
  p.facility_id,
  f.name as facility_name
FROM profiles p
JOIN facilities f ON p.facility_id = f.id
WHERE p.role = 'facility';

SELECT 'VERIFICATION - JUNE 2025 TRIPS:' as section;
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.status,
  p.first_name,
  p.last_name,
  f.name as facility_name
FROM trips t
JOIN profiles p ON t.user_id = p.id
JOIN facilities f ON p.facility_id = f.id
WHERE t.pickup_time >= '2025-06-01'
  AND t.pickup_time <= '2025-06-30'
ORDER BY t.pickup_time;

SELECT 'VERIFICATION - MONTHLY TOTAL:' as section;
SELECT 
  COUNT(*) as trip_count,
  SUM(t.price) as total_amount,
  f.name as facility_name
FROM trips t
JOIN profiles p ON t.user_id = p.id
JOIN facilities f ON p.facility_id = f.id
WHERE t.pickup_time >= '2025-06-01'
  AND t.pickup_time <= '2025-06-30'
GROUP BY f.id, f.name;
