-- Find the correct facility ID and user information
-- Run this in Supabase SQL Editor to get the real facility ID

-- 1. Check all facilities
SELECT id, name, billing_email FROM facilities;

-- 2. Check users with email containing 'facility_test'
SELECT id, email, facility_id, first_name, last_name, role 
FROM profiles 
WHERE email LIKE '%facility_test%' OR role = 'facility';

-- 3. Check if there are any trips at all in the system
SELECT COUNT(*) as total_trips FROM trips;

-- 4. Check recent trips (last 30 days)
SELECT COUNT(*) as recent_trips 
FROM trips 
WHERE pickup_time >= NOW() - INTERVAL '30 days';

-- 5. Check trips for June 2025 specifically
SELECT COUNT(*) as june_2025_trips 
FROM trips 
WHERE pickup_time >= '2025-06-01' AND pickup_time < '2025-07-01';

-- 6. Find any trips with pricing
SELECT COUNT(*) as priced_trips 
FROM trips 
WHERE price IS NOT NULL AND price > 0;
