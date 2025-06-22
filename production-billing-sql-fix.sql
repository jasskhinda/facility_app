-- PRODUCTION BILLING FIX - Run these queries in Supabase SQL Editor
-- These queries will diagnose and fix the billing data issue

-- STEP 1: Find the actual facility and users
SELECT '=== FACILITY INFORMATION ===' as info;
SELECT id, name, billing_email FROM facilities ORDER BY created_at DESC LIMIT 5;

SELECT '=== FACILITY USERS ===' as info;
SELECT id, email, facility_id, first_name, last_name, role 
FROM profiles 
WHERE role = 'facility' OR email LIKE '%facility%' 
ORDER BY created_at DESC;

-- STEP 2: Check existing trips
SELECT '=== TOTAL TRIPS IN SYSTEM ===' as info;
SELECT COUNT(*) as total_trips FROM trips;

SELECT '=== TRIPS BY DATE RANGE ===' as info;
SELECT 
  DATE_TRUNC('month', pickup_time) as month,
  COUNT(*) as trip_count,
  SUM(price) as total_amount
FROM trips 
WHERE price IS NOT NULL AND price > 0
GROUP BY DATE_TRUNC('month', pickup_time)
ORDER BY month DESC
LIMIT 12;

-- STEP 3: Check trips for facility users specifically
SELECT '=== TRIPS FOR FACILITY USERS ===' as info;
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.status,
  t.pickup_address,
  p.facility_id,
  p.email as user_email
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
ORDER BY t.pickup_time DESC
LIMIT 10;

-- STEP 4: Add test data for June 2025 (run only if no data exists)
-- First, check if we need to add data:
SELECT '=== JUNE 2025 TRIPS FOR FACILITIES ===' as info;
SELECT COUNT(*) as june_2025_facility_trips
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-06-01'
  AND t.pickup_time < '2025-07-01';

-- If the above returns 0, run these INSERT statements:

-- Add test trip 1
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, additional_passengers)
SELECT 
  p.id,
  '123 Main St, Columbus, OH',
  'Ohio State University Hospital, Columbus, OH',
  '2025-06-22T10:00:00Z',
  'completed',
  45.50,
  'no_wheelchair',
  false,
  0
FROM profiles p 
WHERE p.facility_id IS NOT NULL 
  AND p.role = 'facility'
LIMIT 1;

-- Add test trip 2
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, additional_passengers)
SELECT 
  p.id,
  '456 Oak Ave, Columbus, OH',
  'Mount Carmel Hospital, Columbus, OH',
  '2025-06-21T14:15:00Z',
  'completed',
  32.75,
  'wheelchair',
  false,
  1
FROM profiles p 
WHERE p.facility_id IS NOT NULL 
  AND p.role = 'facility'
LIMIT 1;

-- Add test trip 3
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, additional_passengers)
SELECT 
  p.id,
  '789 Pine St, Columbus, OH',
  'Riverside Methodist Hospital, Columbus, OH',
  '2025-06-20T09:00:00Z',
  'completed',
  28.25,
  'no_wheelchair',
  true,
  0
FROM profiles p 
WHERE p.facility_id IS NOT NULL 
  AND p.role = 'facility'
LIMIT 1;

-- STEP 5: Verify the fix
SELECT '=== VERIFICATION - JUNE 2025 FACILITY TRIPS ===' as info;
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.status,
  t.pickup_address,
  t.destination_address,
  p.facility_id,
  p.email
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-06-01'
  AND t.pickup_time < '2025-07-01'
  AND t.status IN ('completed', 'pending', 'upcoming')
  AND t.price IS NOT NULL
  AND t.price > 0
ORDER BY t.pickup_time DESC;

-- Calculate expected totals
SELECT '=== EXPECTED BILLING TOTALS ===' as info;
SELECT 
  COUNT(*) as total_trips,
  SUM(t.price) as total_amount,
  p.facility_id
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-06-01'
  AND t.pickup_time < '2025-07-01'
  AND t.status IN ('completed', 'pending', 'upcoming')
  AND t.price IS NOT NULL
  AND t.price > 0
GROUP BY p.facility_id;
