-- Debug script to check actual trip dates and formats in production
-- Run this to see what dates exist and how they're formatted

-- Check all trips for the facility users (replace facility_id with actual value)
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.status,
  t.user_id,
  p.facility_id,
  DATE(t.pickup_time) as pickup_date,
  TO_CHAR(t.pickup_time, 'YYYY-MM') as year_month,
  TO_CHAR(t.pickup_time, 'YYYY-MM-DD HH24:MI:SS') as formatted_pickup_time
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 'YOUR_FACILITY_ID_HERE'  -- Replace with actual facility ID
  AND t.price IS NOT NULL 
  AND t.price > 0
ORDER BY t.pickup_time DESC
LIMIT 20;

-- Check what months have trips
SELECT 
  TO_CHAR(t.pickup_time, 'YYYY-MM') as year_month,
  COUNT(*) as trip_count,
  SUM(t.price) as total_amount,
  MIN(t.pickup_time) as earliest_trip,
  MAX(t.pickup_time) as latest_trip
FROM trips t
JOIN profiles p ON t.user_id = p.id  
WHERE p.facility_id = 'YOUR_FACILITY_ID_HERE'  -- Replace with actual facility ID
  AND t.price IS NOT NULL 
  AND t.price > 0
GROUP BY TO_CHAR(t.pickup_time, 'YYYY-MM')
ORDER BY year_month DESC;

-- Check specifically for June 2025 trips
SELECT 
  t.id,
  t.pickup_time,
  t.price,
  t.status,
  DATE(t.pickup_time) as pickup_date
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 'YOUR_FACILITY_ID_HERE'  -- Replace with actual facility ID
  AND t.pickup_time >= '2025-06-01'
  AND t.pickup_time < '2025-07-01'
  AND t.price IS NOT NULL 
  AND t.price > 0
ORDER BY t.pickup_time DESC;
