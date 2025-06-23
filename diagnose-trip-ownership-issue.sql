-- CRITICAL BILLING ISSUE DIAGNOSIS
-- This query will reveal the actual trip ownership structure

-- 1. Check ALL trips and their user relationships
SELECT 
  'TRIP OWNERSHIP ANALYSIS' as section;

SELECT 
  t.id as trip_id,
  t.pickup_time,
  t.price,
  t.status,
  p.id as user_id,
  p.email,
  p.role,
  p.facility_id,
  p.first_name || ' ' || p.last_name as user_name,
  CASE 
    WHEN p.role = 'facility' THEN 'FACILITY STAFF'
    WHEN p.role = 'client' AND p.facility_id IS NOT NULL THEN 'FACILITY CLIENT'
    WHEN p.role = 'client' AND p.facility_id IS NULL THEN 'INDEPENDENT CLIENT'
    ELSE 'OTHER ROLE'
  END as user_type
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC;

-- 2. Check current facility users (staff)
SELECT 
  'FACILITY STAFF USERS' as section;

SELECT 
  p.id,
  p.email,
  p.role,
  p.facility_id,
  p.first_name || ' ' || p.last_name as name,
  COUNT(t.id) as trip_count
FROM profiles p
LEFT JOIN trips t ON t.user_id = p.id
WHERE p.role = 'facility'
GROUP BY p.id, p.email, p.role, p.facility_id, p.first_name, p.last_name
ORDER BY trip_count DESC;

-- 3. Check facility clients (managed by facilities)
SELECT 
  'FACILITY CLIENTS' as section;

SELECT 
  p.id,
  p.email,
  p.role,
  p.facility_id,
  p.first_name || ' ' || p.last_name as name,
  COUNT(t.id) as trip_count,
  f.name as facility_name
FROM profiles p
LEFT JOIN trips t ON t.user_id = p.id
LEFT JOIN facilities f ON f.id = p.facility_id
WHERE p.role = 'client' AND p.facility_id IS NOT NULL
GROUP BY p.id, p.email, p.role, p.facility_id, p.first_name, p.last_name, f.name
ORDER BY trip_count DESC;

-- 4. Check what the billing component is currently looking for
SELECT 
  'BILLING COMPONENT QUERY' as section;

-- This is what the billing component currently searches for:
SELECT 
  'Users with role=facility and facility_id=e1b94bde-d092-4ce6-b78c-9cff1d0118a3' as looking_for,
  COUNT(*) as found_count
FROM profiles 
WHERE role = 'facility' 
  AND facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';

-- 5. Check what trips actually exist for that facility's CLIENTS
SELECT 
  'ACTUAL FACILITY TRIPS (CLIENTS)' as section;

SELECT 
  COUNT(*) as total_trips,
  SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_trips,
  SUM(CASE WHEN t.price > 0 THEN t.price ELSE 0 END) as total_amount
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
  AND t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01';

-- 6. SOLUTION: Show what the billing component SHOULD be looking for
SELECT 
  'CORRECT BILLING QUERY' as section;

SELECT 
  t.id,
  t.pickup_time,
  t.pickup_address,
  t.destination_address,
  t.price,
  t.status,
  p.first_name || ' ' || p.last_name as client_name,
  p.email as client_email,
  p.role as client_role,
  f.name as facility_name
FROM trips t
JOIN profiles p ON t.user_id = p.id
JOIN facilities f ON f.id = p.facility_id
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
  AND t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC;
