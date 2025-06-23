-- Comprehensive Dashboard Data Fix
-- Date: June 23, 2025

-- 1. Update all facility clients to active status
UPDATE profiles 
SET status = 'active' 
WHERE facility_id IS NOT NULL 
  AND role = 'facility';

-- 2. Insert comprehensive test trips for June 2025
-- First, let's get a facility ID and user IDs to work with
WITH facility_info AS (
  SELECT f.id as facility_id, 
         array_agg(p.id) as user_ids,
         array_agg(p.first_name || ' ' || p.last_name) as user_names
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id 
  WHERE p.role = 'facility'
  GROUP BY f.id
  LIMIT 1
)
-- Insert trips for multiple dates in June 2025
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
  user_ids[((ROW_NUMBER() OVER()) % array_length(user_ids, 1)) + 1] as user_id,
  CASE ((ROW_NUMBER() OVER()) % 5)
    WHEN 0 THEN '123 Medical Center Dr, Columbus, OH 43215'
    WHEN 1 THEN '456 Senior Living Blvd, Columbus, OH 43220'
    WHEN 2 THEN '789 Assisted Care Way, Columbus, OH 43235'
    WHEN 3 THEN '321 Memory Care Dr, Columbus, OH 43240'
    ELSE '654 Elder Ave, Columbus, OH 43214'
  END as pickup_address,
  CASE ((ROW_NUMBER() OVER()) % 5)
    WHEN 0 THEN 'Ohio State University Wexner Medical Center, Columbus, OH'
    WHEN 1 THEN 'Mount Carmel East Hospital, Columbus, OH'
    WHEN 2 THEN 'Grant Medical Center, Columbus, OH'
    WHEN 3 THEN 'Riverside Methodist Hospital, Columbus, OH'
    ELSE 'Nationwide Children''s Hospital, Columbus, OH'
  END as destination_address,
  ('2025-06-' || LPAD((((ROW_NUMBER() OVER()) % 23) + 1)::text, 2, '0') || 'T' || 
   LPAD((((ROW_NUMBER() OVER()) % 12) + 8)::text, 2, '0') || ':' ||
   LPAD((((ROW_NUMBER() OVER()) % 6) * 10)::text, 2, '0') || ':00Z')::timestamp as pickup_time,
  CASE ((ROW_NUMBER() OVER()) % 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'completed'
    WHEN 2 THEN 'pending'
    ELSE 'confirmed'
  END as status,
  (35.00 + ((ROW_NUMBER() OVER()) % 40))::decimal(10,2) as price,
  CASE ((ROW_NUMBER() OVER()) % 4)
    WHEN 0 THEN 'no_wheelchair'
    WHEN 1 THEN 'provided'
    WHEN 2 THEN 'manual'
    ELSE 'power'
  END as wheelchair_type,
  ((ROW_NUMBER() OVER()) % 3 = 0) as is_round_trip,
  (6.5 + ((ROW_NUMBER() OVER()) % 8))::decimal(10,2) as distance,
  ((ROW_NUMBER() OVER()) % 3) as additional_passengers,
  ('2025-06-' || LPAD((((ROW_NUMBER() OVER()) % 23) + 1)::text, 2, '0') || 'T' || 
   LPAD((((ROW_NUMBER() OVER()) % 12) + 7)::text, 2, '0') || ':' ||
   LPAD((((ROW_NUMBER() OVER()) % 6) * 10)::text, 2, '0') || ':00Z')::timestamp as created_at
FROM facility_info
CROSS JOIN generate_series(1, 25) as trip_number;

-- 3. Add specific trips for today (June 23, 2025) to ensure "Today's Trips" shows data
WITH facility_info AS (
  SELECT f.id as facility_id, 
         array_agg(p.id) as user_ids
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id 
  WHERE p.role = 'facility'
  GROUP BY f.id
  LIMIT 1
)
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
  user_ids[1] as user_id,
  '100 Today Medical Dr, Columbus, OH 43215' as pickup_address,
  'Today Healthcare Center, Columbus, OH' as destination_address,
  '2025-06-23T14:30:00Z'::timestamp as pickup_time,
  'pending' as status,
  55.00 as price,
  'no_wheelchair' as wheelchair_type,
  false as is_round_trip,
  9.2 as distance,
  0 as additional_passengers,
  '2025-06-23T13:30:00Z'::timestamp as created_at
FROM facility_info

UNION ALL

SELECT 
  user_ids[2] as user_id,
  '200 Current Health Ave, Columbus, OH 43220' as pickup_address,
  'Current Medical Facility, Columbus, OH' as destination_address,
  '2025-06-23T16:45:00Z'::timestamp as pickup_time,
  'confirmed' as status,
  42.75 as price,
  'provided' as wheelchair_type,
  false as is_round_trip,
  7.8 as distance,
  1 as additional_passengers,
  '2025-06-23T15:45:00Z'::timestamp as created_at
FROM facility_info;

-- 4. Verify the results with counts
SELECT 'Active Clients' as metric, COUNT(*) as count
FROM profiles 
WHERE facility_id IS NOT NULL 
  AND role = 'facility' 
  AND status = 'active'

UNION ALL

SELECT 'Today''s Trips' as metric, COUNT(*) as count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND t.pickup_time >= '2025-06-23T00:00:00Z'
  AND t.pickup_time < '2025-06-24T00:00:00Z'

UNION ALL

SELECT 'This Week''s Trips' as metric, COUNT(*) as count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND t.pickup_time >= '2025-06-17T00:00:00Z'
  AND t.pickup_time < '2025-06-24T00:00:00Z'

UNION ALL

SELECT 'Monthly Completed Trips' as metric, COUNT(*) as count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND t.status = 'completed'
  AND t.pickup_time >= '2025-06-01T00:00:00Z'
  AND t.pickup_time < '2025-07-01T00:00:00Z';

-- 5. Show monthly spend calculation
SELECT 'Monthly Spend' as metric, 
       COALESCE(SUM(t.price), 0) as total_amount
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND t.status = 'completed'
  AND t.pickup_time >= '2025-06-01T00:00:00Z'
  AND t.pickup_time < '2025-07-01T00:00:00Z';

-- 6. Show recent trips with client names
SELECT 
  t.id,
  p.first_name || ' ' || p.last_name as client_name,
  t.pickup_time,
  t.status,
  t.price
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
ORDER BY t.pickup_time DESC
LIMIT 10;
