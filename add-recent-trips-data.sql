-- Quick Recent Trips Data Fix
-- Add some recent trips for dashboard testing

-- First, get facility and user info
WITH facility_info AS (
  SELECT 
    f.id as facility_id,
    p.id as user_id,
    p.first_name,
    p.last_name
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id
  WHERE p.role = 'facility'
  LIMIT 5
)

-- Insert recent trips (last 7 days)
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
  user_id,
  CASE (ROW_NUMBER() OVER()) % 5
    WHEN 0 THEN '123 Recent Medical Dr, Columbus, OH 43215'
    WHEN 1 THEN '456 Recent Care Blvd, Columbus, OH 43220'
    WHEN 2 THEN '789 Recent Health Way, Columbus, OH 43235'
    WHEN 3 THEN '321 Recent Senior Dr, Columbus, OH 43240'
    ELSE '654 Recent Elder Ave, Columbus, OH 43214'
  END as pickup_address,
  CASE (ROW_NUMBER() OVER()) % 5
    WHEN 0 THEN 'Recent Medical Center, Columbus, OH'
    WHEN 1 THEN 'Recent Hospital East, Columbus, OH'
    WHEN 2 THEN 'Recent Health Center, Columbus, OH'
    WHEN 3 THEN 'Recent Medical West, Columbus, OH'
    ELSE 'Recent Care Facility, Columbus, OH'
  END as destination_address,
  (NOW() - INTERVAL '1 day' * ((ROW_NUMBER() OVER()) % 7)) as pickup_time,
  CASE (ROW_NUMBER() OVER()) % 3
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'pending'
    ELSE 'confirmed'
  END as status,
  (45.00 + ((ROW_NUMBER() OVER()) % 30))::decimal(10,2) as price,
  CASE (ROW_NUMBER() OVER()) % 3
    WHEN 0 THEN 'no_wheelchair'
    WHEN 1 THEN 'provided'
    ELSE 'manual'
  END as wheelchair_type,
  ((ROW_NUMBER() OVER()) % 2 = 0) as is_round_trip,
  (8.0 + ((ROW_NUMBER() OVER()) % 5))::decimal(10,2) as distance,
  ((ROW_NUMBER() OVER()) % 2) as additional_passengers,
  (NOW() - INTERVAL '1 day' * ((ROW_NUMBER() OVER()) % 7) - INTERVAL '1 hour') as created_at
FROM facility_info
CROSS JOIN generate_series(1, 10);

-- Verify the data was inserted
SELECT 
  t.id,
  p.first_name || ' ' || p.last_name as client_name,
  t.pickup_address,
  t.destination_address,
  t.pickup_time,
  t.status,
  t.price,
  t.created_at
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.created_at >= NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC
LIMIT 10;
