-- Quick Fix: Add June 2025 Billing Data
-- This will fix the billing page showing wrong months

-- 1. Make sure we have active facility clients
UPDATE profiles 
SET status = 'active' 
WHERE facility_id IS NOT NULL AND role = 'facility';

-- 2. Add June 2025 trips specifically for billing testing
WITH facility_users AS (
  SELECT p.id as user_id, f.id as facility_id
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id
  WHERE p.role = 'facility'
  LIMIT 3
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
  user_id,
  'June Medical Center ' || (ROW_NUMBER() OVER()) || ', Columbus, OH',
  'June Hospital ' || (ROW_NUMBER() OVER()) || ', Columbus, OH',
  ('2025-06-' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || 'T' || 
   LPAD(((ROW_NUMBER() OVER() % 10) + 8)::text, 2, '0') || ':30:00Z')::timestamp,
  CASE (ROW_NUMBER() OVER()) % 4
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'completed' 
    WHEN 2 THEN 'pending'
    ELSE 'confirmed'
  END,
  (50.00 + ((ROW_NUMBER() OVER()) * 7.50))::decimal(10,2),
  CASE (ROW_NUMBER() OVER()) % 4
    WHEN 0 THEN 'no_wheelchair'
    WHEN 1 THEN 'provided'
    WHEN 2 THEN 'manual'
    ELSE 'power'
  END,
  ((ROW_NUMBER() OVER()) % 3 = 0),
  (8.0 + ((ROW_NUMBER() OVER()) * 0.5))::decimal(10,2),
  ((ROW_NUMBER() OVER()) % 3),
  ('2025-06-' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || 'T' || 
   LPAD(((ROW_NUMBER() OVER() % 10) + 7)::text, 2, '0') || ':30:00Z')::timestamp
FROM facility_users
CROSS JOIN generate_series(1, 20);

-- 3. Add trips for other months to test dropdown
WITH facility_users AS (
  SELECT p.id as user_id
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id
  WHERE p.role = 'facility'
  LIMIT 2
)
-- May 2025 trips
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, distance, additional_passengers, created_at)
SELECT 
  user_id,
  'May Medical ' || gs.i || ', Columbus, OH',
  'May Hospital ' || gs.i || ', Columbus, OH', 
  ('2025-05-' || LPAD(gs.i::text, 2, '0') || 'T10:00:00Z')::timestamp,
  CASE gs.i % 3 WHEN 0 THEN 'completed' WHEN 1 THEN 'completed' ELSE 'pending' END,
  40.00 + (gs.i * 5),
  'no_wheelchair',
  false,
  7.5,
  0,
  ('2025-05-' || LPAD(gs.i::text, 2, '0') || 'T09:00:00Z')::timestamp
FROM facility_users
CROSS JOIN generate_series(1, 10) gs(i);

-- April 2025 trips
WITH facility_users AS (
  SELECT p.id as user_id
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id
  WHERE p.role = 'facility'
  LIMIT 2
)
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, distance, additional_passengers, created_at)
SELECT 
  user_id,
  'April Medical ' || gs.i || ', Columbus, OH',
  'April Hospital ' || gs.i || ', Columbus, OH',
  ('2025-04-' || LPAD(gs.i::text, 2, '0') || 'T14:00:00Z')::timestamp,
  CASE gs.i % 3 WHEN 0 THEN 'completed' WHEN 1 THEN 'completed' ELSE 'pending' END,
  45.00 + (gs.i * 6),
  'provided',
  false,
  8.0,
  1,
  ('2025-04-' || LPAD(gs.i::text, 2, '0') || 'T13:00:00Z')::timestamp
FROM facility_users
CROSS JOIN generate_series(1, 8) gs(i);

-- 4. Add recent trips for dashboard
WITH facility_users AS (
  SELECT p.id as user_id
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id
  WHERE p.role = 'facility'
  LIMIT 2
)
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, distance, additional_passengers, created_at)
SELECT 
  user_id,
  'Recent Trip ' || gs.i || ', Columbus, OH',
  'Recent Hospital ' || gs.i || ', Columbus, OH',
  (CURRENT_DATE - (gs.i || ' days')::interval + (gs.i || ' hours')::interval)::timestamp,
  CASE gs.i % 3 WHEN 0 THEN 'completed' WHEN 1 THEN 'pending' ELSE 'confirmed' END,
  50.00 + (gs.i * 5),
  'no_wheelchair',
  false,
  9.0,
  0,
  (CURRENT_DATE - (gs.i || ' days')::interval)::timestamp
FROM facility_users
CROSS JOIN generate_series(1, 7) gs(i);

-- 5. Verification
SELECT 'Data Check' as check_type;

SELECT 'June 2025 Trips' as month, COUNT(*) as count, SUM(price) as total
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND t.pickup_time >= '2025-06-01T00:00:00Z'
  AND t.pickup_time < '2025-07-01T00:00:00Z'

UNION ALL

SELECT 'May 2025 Trips' as month, COUNT(*) as count, SUM(price) as total
FROM trips t
JOIN profiles p ON t.user_id = p.id  
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-05-01T00:00:00Z'
  AND t.pickup_time < '2025-06-01T00:00:00Z'

UNION ALL

SELECT 'April 2025 Trips' as month, COUNT(*) as count, SUM(price) as total
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-04-01T00:00:00Z'
  AND t.pickup_time < '2025-05-01T00:00:00Z'

UNION ALL

SELECT 'Recent Trips (Last 7 days)' as month, COUNT(*) as count, SUM(price) as total
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= CURRENT_DATE - INTERVAL '7 days';

-- Show sample trips with client names
SELECT 
  TO_CHAR(t.pickup_time, 'YYYY-MM') as month,
  p.first_name || ' ' || p.last_name as client_name,
  t.pickup_address,
  t.price,
  t.status
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-04-01T00:00:00Z'
ORDER BY t.pickup_time DESC
LIMIT 15;
