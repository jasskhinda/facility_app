-- CRITICAL: Multi-App Trip Ownership Diagnosis
-- This will reveal how to distinguish between facility trips vs individual trips

-- 1. Check trip table structure to understand ownership markers
SELECT 
  'TRIP TABLE STRUCTURE' as section;

-- Get sample trips with all relevant fields
SELECT 
  t.id,
  t.pickup_time,
  t.status,
  t.price,
  t.user_id,
  t.facility_id,
  t.created_by,
  t.booking_source,
  t.app_source,
  p.email as user_email,
  p.role as user_role,
  p.facility_id as user_facility_id,
  CASE 
    WHEN t.facility_id IS NOT NULL THEN 'FACILITY_TRIP'
    WHEN p.facility_id IS NOT NULL AND p.role = 'client' THEN 'FACILITY_CLIENT_INDIVIDUAL_TRIP'
    WHEN p.facility_id IS NULL AND p.role = 'client' THEN 'INDIVIDUAL_TRIP'
    ELSE 'OTHER'
  END as trip_classification
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC
LIMIT 10;

-- 2. Check if trips table has facility_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'trips' 
  AND column_name IN ('facility_id', 'created_by', 'booking_source', 'app_source', 'booked_by');

-- 3. Check if there's a way to distinguish facility-created trips vs individual trips
SELECT 
  'TRIP CREATION SOURCE ANALYSIS' as section;

-- Look for patterns that might indicate trip source
SELECT 
  DISTINCT 
  COALESCE(t.facility_id, 'NULL') as trip_facility_id,
  p.role as user_role,
  COALESCE(p.facility_id, 'NULL') as user_facility_id,
  COUNT(*) as count
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE t.pickup_time >= '2025-06-01' 
GROUP BY t.facility_id, p.role, p.facility_id
ORDER BY count DESC;

-- 4. Proposed solution check: Should trips have facility_id when created by facility?
SELECT 
  'FACILITY TRIP IDENTIFICATION' as section;

-- Check if we need to add a field to distinguish trip sources
SELECT 
  'Current trip ownership logic needs clarification' as issue,
  'Need to distinguish: Facility-created trips vs Individual-booked trips' as solution;

-- 5. Sample query for what facility billing SHOULD show
SELECT 
  'CORRECT FACILITY BILLING QUERY' as section;

-- This is what facility billing should show (modify based on your schema):
-- Option 1: If trips have facility_id field
/*
SELECT t.* 
FROM trips t 
WHERE t.facility_id = 'your_facility_id'
  AND t.pickup_time >= '2025-06-01';
*/

-- Option 2: If trips need to be identified by creation source
/*
SELECT t.* 
FROM trips t 
WHERE t.created_by_facility = 'your_facility_id'
  AND t.pickup_time >= '2025-06-01';
*/

-- Option 3: Current (wrong) - shows all trips for facility users
/*
SELECT t.* 
FROM trips t 
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 'your_facility_id'
  AND t.pickup_time >= '2025-06-01';
*/
