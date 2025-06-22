-- STEP 1: Find the correct facility ID and user email
-- Run these queries one by one in Supabase SQL Editor

-- First, find all available facilities
SELECT id, name, billing_email, created_at 
FROM facilities 
ORDER BY created_at DESC;

-- Second, find the user who created the June trips
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
  AND t.status = 'completed'
  AND t.price IS NOT NULL
GROUP BY p.id, p.email, p.facility_id, p.role, p.first_name, p.last_name
ORDER BY trip_count DESC;

-- Third, check what the current facility user looks like (if any)
SELECT id, email, facility_id, role, first_name, last_name 
FROM profiles 
WHERE role = 'facility' 
   OR email LIKE '%facility%'
ORDER BY created_at DESC;
