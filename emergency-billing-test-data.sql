-- Emergency SQL to add June 2025 billing test data
-- This will create test trips for facility billing verification

-- First, let's check what facilities exist
SELECT id, name FROM facilities LIMIT 3;

-- Add test trips for June 2025 (assuming facility_id = 1 exists)
-- Note: Replace facility_id and user_id with actual values from your database

-- Test Trip 1
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
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE facility_id = (SELECT id FROM facilities LIMIT 1) AND role = 'facility' LIMIT 1),
  '123 Medical Center Dr, City, State 12345',
  '456 Hospital Ave, City, State 12345',
  '2025-06-15 09:30:00+00',
  45.50,
  'none',
  false,
  0,
  'completed',
  '2025-06-15 08:00:00+00',
  '2025-06-15 10:30:00+00'
);

-- Test Trip 2
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
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE facility_id = (SELECT id FROM facilities LIMIT 1) AND role = 'facility' LIMIT 1),
  '789 Therapy Center Blvd, City, State 12345',
  '321 Rehab Facility St, City, State 12345',
  '2025-06-18 14:15:00+00',
  62.75,
  'provided',
  true,
  1,
  'completed',
  '2025-06-18 13:00:00+00',
  '2025-06-18 16:30:00+00'
);

-- Test Trip 3
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
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE facility_id = (SELECT id FROM facilities LIMIT 1) AND role = 'facility' LIMIT 1),
  '555 Senior Center Way, City, State 12345',
  '888 Specialist Clinic Dr, City, State 12345',
  '2025-06-22 11:00:00+00',
  38.25,
  'personal',
  false,
  2,
  'completed',
  '2025-06-22 10:15:00+00',
  '2025-06-22 12:45:00+00'
);

-- Verify the data was added
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.wheelchair_type,
  t.status,
  p.first_name,
  p.last_name,
  f.name as facility_name
FROM trips t
JOIN profiles p ON t.user_id = p.id
JOIN facilities f ON p.facility_id = f.id
WHERE t.pickup_time >= '2025-06-01' 
  AND t.pickup_time <= '2025-06-30'
ORDER BY t.pickup_time DESC;
