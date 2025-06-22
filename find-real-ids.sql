-- STEP 1: Find the actual facility ID and user information
-- Run these queries ONE BY ONE in Supabase SQL Editor

-- Query 1: Find all facilities in your system
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
GROUP BY p.id, p.email, p.facility_id, p.role, p.first_name, p.last_name
ORDER BY trip_count DESC;

-- Query 3: Check current facility users (if any)
SELECT id, email, facility_id, role, first_name, last_name 
FROM profiles 
WHERE role = 'facility' OR facility_id IS NOT NULL
ORDER BY created_at DESC;
