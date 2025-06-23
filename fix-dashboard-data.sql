-- Fix Dashboard Data Issues
-- Current date: June 23, 2025

-- 1. First, let's check what facility we're working with
SELECT 
  id as facility_id,
  name,
  created_at
FROM facilities 
LIMIT 5;

-- 2. Check the profiles/clients issue
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.facility_id,
  p.role,
  p.status,
  p.client_type,
  p.created_at
FROM profiles p 
WHERE p.facility_id IS NOT NULL
ORDER BY p.created_at DESC;

-- 3. Check current trips for June 2025
SELECT 
  t.id,
  t.pickup_time,
  t.status,
  t.price,
  t.wheelchair_type,
  t.user_id,
  t.managed_client_id,
  t.facility_id,
  t.created_at
FROM trips t 
WHERE t.pickup_time >= '2025-06-01'
  AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC;

-- 4. Check if we have any completed trips for billing
SELECT 
  t.status,
  COUNT(*) as count,
  SUM(t.price) as total_price
FROM trips t 
WHERE t.pickup_time >= '2025-06-01'
  AND t.pickup_time < '2025-07-01'
GROUP BY t.status;
