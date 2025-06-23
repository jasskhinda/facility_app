-- Emergency Dashboard and Billing Data Fix
-- Current date: June 23, 2025

-- 1. Update all facility clients to active status for dashboard metrics
UPDATE profiles 
SET status = 'active' 
WHERE facility_id IS NOT NULL 
  AND role = 'facility';

-- 2. Create comprehensive test data for both dashboard and billing

-- Get facility and user info
DO $$
DECLARE
  facility_record RECORD;
  user_record RECORD;
  trip_date DATE;
  i INTEGER;
BEGIN
  -- Get the first facility
  SELECT id INTO facility_record FROM facilities LIMIT 1;
  
  IF facility_record.id IS NOT NULL THEN
    -- For each facility user, create trips
    FOR user_record IN 
      SELECT id, first_name, last_name 
      FROM profiles 
      WHERE facility_id = facility_record.id 
        AND role = 'facility' 
      LIMIT 5
    LOOP
      -- Create recent trips (last 7 days) for dashboard
      FOR i IN 1..5 LOOP
        trip_date := CURRENT_DATE - (i || ' days')::INTERVAL;
        
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
        ) VALUES (
          user_record.id,
          'Recent Pickup Address ' || i || ', Columbus, OH 432' || (10 + i)::text,
          'Recent Destination ' || i || ', Columbus, OH',
          trip_date + (i * 2 || ' hours')::INTERVAL,
          CASE i % 3 
            WHEN 0 THEN 'completed'
            WHEN 1 THEN 'pending'
            ELSE 'confirmed'
          END,
          40.00 + (i * 5.50),
          CASE i % 3
            WHEN 0 THEN 'no_wheelchair'
            WHEN 1 THEN 'provided'
            ELSE 'manual'
          END,
          (i % 2 = 0),
          7.5 + i,
          i % 2,
          trip_date + ((i * 2 - 1) || ' hours')::INTERVAL
        );
      END LOOP;
      
      -- Create billing trips for current month (June 2025)
      FOR i IN 1..8 LOOP
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
        ) VALUES (
          user_record.id,
          'June Pickup ' || i || ', Columbus, OH 432' || (15 + i)::text,
          'June Medical Center ' || i || ', Columbus, OH',
          ('2025-06-' || LPAD(i::text, 2, '0') || 'T' || LPAD((8 + i)::text, 2, '0') || ':30:00Z')::timestamp,
          CASE i % 4
            WHEN 0 THEN 'completed'
            WHEN 1 THEN 'completed'
            WHEN 2 THEN 'pending'
            ELSE 'confirmed'
          END,
          45.00 + (i * 7.25),
          CASE i % 4
            WHEN 0 THEN 'no_wheelchair'
            WHEN 1 THEN 'provided'
            WHEN 2 THEN 'manual'
            ELSE 'power'
          END,
          (i % 3 = 0),
          8.5 + (i * 0.5),
          i % 3,
          ('2025-06-' || LPAD(i::text, 2, '0') || 'T' || LPAD((7 + i)::text, 2, '0') || ':30:00Z')::timestamp
        );
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- 3. Add specific trips for today (June 23, 2025) for dashboard "Today's Trips"
WITH facility_users AS (
  SELECT p.id as user_id
  FROM facilities f
  JOIN profiles p ON p.facility_id = f.id
  WHERE p.role = 'facility'
  LIMIT 2
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
  'Today Special Pickup, Columbus, OH 43215',
  'Today Medical Center, Columbus, OH',
  '2025-06-23T' || LPAD((10 + (ROW_NUMBER() OVER()))::text, 2, '0') || ':30:00Z',
  CASE (ROW_NUMBER() OVER()) % 2
    WHEN 0 THEN 'completed'
    ELSE 'pending'
  END,
  55.00 + ((ROW_NUMBER() OVER()) * 5),
  'no_wheelchair',
  false,
  9.5,
  0,
  '2025-06-23T' || LPAD((9 + (ROW_NUMBER() OVER()))::text, 2, '0') || ':30:00Z'
FROM facility_users;

-- 4. Verification queries
SELECT 'Dashboard Metrics Check' as check_type;

-- Active clients count
SELECT 'Active Clients' as metric, COUNT(*) as count
FROM profiles 
WHERE facility_id IS NOT NULL 
  AND role = 'facility' 
  AND status = 'active';

-- Today's trips count  
SELECT 'Todays Trips' as metric, COUNT(*) as count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND DATE(t.pickup_time) = '2025-06-23';

-- Recent trips count (last 7 days)
SELECT 'Recent Trips' as metric, COUNT(*) as count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND t.pickup_time >= CURRENT_DATE - INTERVAL '7 days';

-- Monthly spend (completed June trips)
SELECT 'Monthly Spend' as metric, COALESCE(SUM(t.price), 0) as amount
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
  AND t.status = 'completed'
  AND t.pickup_time >= '2025-06-01T00:00:00Z'
  AND t.pickup_time < '2025-07-01T00:00:00Z';

-- Sample recent trips with client names
SELECT 
  t.id,
  p.first_name || ' ' || p.last_name as client_name,
  t.pickup_address,
  t.pickup_time,
  t.status,
  t.price
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL 
ORDER BY t.pickup_time DESC
LIMIT 10;
