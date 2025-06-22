-- STEP 1: Find the real facility ID and user who created the trips
-- Copy and paste these queries one by one into Supabase SQL Editor

-- Query 1: Find all facilities
SELECT id, name, billing_email, created_at 
FROM facilities 
ORDER BY created_at DESC;

-- Query 2: Find the user who created the June trips  
SELECT DISTINCT 
  p.id as user_id,
  p.email,
  p.facility_id,
  p.role,
  p.first_name,
  p.last_name,
  COUNT(t.id) as trip_count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
  AND t.status IN ('completed', 'pending')
  AND t.price IS NOT NULL
GROUP BY p.id, p.email, p.facility_id, p.role, p.first_name, p.last_name
ORDER BY trip_count DESC;
