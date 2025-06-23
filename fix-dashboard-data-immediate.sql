-- Fix Dashboard Data Issues - Add Current June 2025 Data
-- Current date: June 23, 2025

-- First, let's see what we have
SELECT 'Current facilities:' as info;
SELECT id, name FROM facilities LIMIT 3;

SELECT 'Current facility users:' as info;
SELECT id, first_name, last_name, facility_id, role 
FROM profiles 
WHERE facility_id IS NOT NULL AND role = 'facility';

-- Add June 2025 trips for the current month
INSERT INTO trips (
  user_id, 
  pickup_address, 
  destination_address, 
  pickup_time, 
  status, 
  price, 
  wheelchair_type, 
  is_round_trip, 
  distance, 
  additional_passengers, 
  created_at
)
SELECT 
  p.id as user_id,
  'June Medical Center ' || (ROW_NUMBER() OVER()) || ', Columbus, OH' as pickup_address,
  'June Hospital ' || (ROW_NUMBER() OVER()) || ', Columbus, OH' as destination_address,
  ('2025-06-' || LPAD((ROW_NUMBER() OVER() % 22 + 1)::text, 2, '0') || 'T' || 
   LPAD(((ROW_NUMBER() OVER() % 12) + 8)::text, 2, '0') || ':' ||
   LPAD(((ROW_NUMBER() OVER() % 4) * 15)::text, 2, '0') || ':00Z')::timestamp as pickup_time,
  CASE (ROW_NUMBER() OVER()) % 3
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'completed' 
    ELSE 'confirmed'
  END as status,
  (45.00 + ((ROW_NUMBER() OVER()) * 2.50))::decimal(10,2) as price,
  CASE (ROW_NUMBER() OVER()) % 4
    WHEN 0 THEN 'no_wheelchair'
    WHEN 1 THEN 'provided'
    WHEN 2 THEN 'manual'
    ELSE 'power'
  END as wheelchair_type,
  ((ROW_NUMBER() OVER()) % 3 = 0) as is_round_trip,
  (8.0 + ((ROW_NUMBER() OVER()) * 0.5))::decimal(10,2) as distance,
  ((ROW_NUMBER() OVER()) % 3) as additional_passengers,
  NOW() as created_at
FROM profiles p
WHERE p.facility_id IS NOT NULL 
  AND p.role = 'facility'
  AND p.id NOT IN (
    SELECT DISTINCT user_id 
    FROM trips 
    WHERE pickup_time >= '2025-06-01' 
      AND pickup_time < '2025-07-01'
      AND user_id IS NOT NULL
  )
LIMIT 15;

-- Also add some May 2025 trips for dropdown testing
INSERT INTO trips (
  user_id, 
  pickup_address, 
  destination_address, 
  pickup_time, 
  status, 
  price, 
  wheelchair_type, 
  is_round_trip, 
  distance, 
  additional_passengers, 
  created_at
)
SELECT 
  p.id as user_id,
  'May Medical Center ' || (ROW_NUMBER() OVER()) || ', Columbus, OH' as pickup_address,
  'May Hospital ' || (ROW_NUMBER() OVER()) || ', Columbus, OH' as destination_address,
  ('2025-05-' || LPAD((ROW_NUMBER() OVER() % 28 + 1)::text, 2, '0') || 'T' || 
   LPAD(((ROW_NUMBER() OVER() % 12) + 8)::text, 2, '0') || ':' ||
   LPAD(((ROW_NUMBER() OVER() % 4) * 15)::text, 2, '0') || ':00Z')::timestamp as pickup_time,
  'completed' as status,
  (38.00 + ((ROW_NUMBER() OVER()) * 3.00))::decimal(10,2) as price,
  'no_wheelchair' as wheelchair_type,
  false as is_round_trip,
  (6.0 + ((ROW_NUMBER() OVER()) * 0.3))::decimal(10,2) as distance,
  0 as additional_passengers,
  NOW() as created_at
FROM profiles p
WHERE p.facility_id IS NOT NULL 
  AND p.role = 'facility'
LIMIT 10;

-- Add some April 2025 trips too
INSERT INTO trips (
  user_id, 
  pickup_address, 
  destination_address, 
  pickup_time, 
  status, 
  price, 
  wheelchair_type, 
  is_round_trip, 
  distance, 
  additional_passengers, 
  created_at
)
SELECT 
  p.id as user_id,
  'April Medical Center ' || (ROW_NUMBER() OVER()) || ', Columbus, OH' as pickup_address,
  'April Hospital ' || (ROW_NUMBER() OVER()) || ', Columbus, OH' as destination_address,
  ('2025-04-' || LPAD((ROW_NUMBER() OVER() % 28 + 1)::text, 2, '0') || 'T' || 
   LPAD(((ROW_NUMBER() OVER() % 12) + 9)::text, 2, '0') || ':' ||
   LPAD(((ROW_NUMBER() OVER() % 4) * 15)::text, 2, '0') || ':00Z')::timestamp as pickup_time,
  'completed' as status,
  (42.00 + ((ROW_NUMBER() OVER()) * 2.75))::decimal(10,2) as price,
  'manual' as wheelchair_type,
  ((ROW_NUMBER() OVER()) % 2 = 0) as is_round_trip,
  (7.0 + ((ROW_NUMBER() OVER()) * 0.4))::decimal(10,2) as distance,
  ((ROW_NUMBER() OVER()) % 2) as additional_passengers,
  NOW() as created_at
FROM profiles p
WHERE p.facility_id IS NOT NULL 
  AND p.role = 'facility'
LIMIT 8;

-- Verify the data was added
SELECT 'June 2025 trips added:' as info;
SELECT 
  DATE_TRUNC('month', pickup_time) as month,
  COUNT(*) as trip_count,
  SUM(price) as total_amount
FROM trips 
WHERE pickup_time >= '2025-04-01' 
  AND pickup_time < '2025-07-01'
GROUP BY DATE_TRUNC('month', pickup_time)
ORDER BY month DESC;
