-- Comprehensive test data insertion for ANY facility user
-- This will work regardless of the specific facility_id

-- Method 1: Add trips for ANY facility user (if facility users exist)
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, additional_passengers)
SELECT 
  p.id,
  'Test Pickup Address, Columbus, OH',
  'Test Destination Hospital, Columbus, OH',
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

-- Method 2: Add more test trips for the current month
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, additional_passengers)
SELECT 
  p.id,
  'Another Test Address, Columbus, OH',
  'Another Test Hospital, Columbus, OH',
  NOW(),
  'completed',
  32.75,
  'wheelchair',
  false,
  1
FROM profiles p 
WHERE p.facility_id IS NOT NULL
LIMIT 1;

-- Method 3: Add trip for June 2025 specifically
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, additional_passengers)
SELECT 
  p.id,
  'June 2025 Test Address, Columbus, OH',
  'June 2025 Test Hospital, Columbus, OH',
  '2025-06-15T14:30:00Z',
  'completed',
  28.25,
  'no_wheelchair',
  true,
  0
FROM profiles p 
WHERE p.facility_id IS NOT NULL
LIMIT 1;

-- Verification queries to run after inserting:

-- Check if trips were added
SELECT COUNT(*) as new_trips FROM trips WHERE pickup_address LIKE '%Test%';

-- Check trips for current month
SELECT t.id, t.pickup_time, t.price, t.status, p.facility_id, p.email
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= DATE_TRUNC('month', NOW())
  AND t.pickup_time < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
ORDER BY t.pickup_time DESC;

-- Check trips for June 2025
SELECT t.id, t.pickup_time, t.price, t.status, p.facility_id, p.email
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= '2025-06-01'
  AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC;
