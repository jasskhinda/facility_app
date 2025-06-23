-- IMMEDIATE FIX: Make sure all June 2025 trips are visible
-- Run this SQL to ensure trips show up in billing

-- First, check current June trips
SELECT 
    'CURRENT JUNE 2025 TRIPS' as section,
    pickup_time,
    status,
    price,
    pickup_address,
    destination_address
FROM trips 
WHERE pickup_time >= '2025-06-01T00:00:00.000Z' 
    AND pickup_time <= '2025-06-31T23:59:59.999Z'
ORDER BY pickup_time;

-- Update any 'Pending Approval' status to 'pending' 
UPDATE trips 
SET status = 'pending'
WHERE status IN ('Pending Approval', 'pending approval', 'PENDING_APPROVAL')
    AND pickup_time >= '2025-06-01T00:00:00.000Z' 
    AND pickup_time <= '2025-06-31T23:59:59.999Z';

-- Ensure all trips have proper formatting
UPDATE trips 
SET pickup_time = REPLACE(pickup_time, ' ', 'T') || 'Z'
WHERE pickup_time >= '2025-06-01' 
    AND pickup_time <= '2025-06-31'
    AND pickup_time NOT LIKE '%T%Z';

-- Final verification
SELECT 
    'FINAL VERIFICATION' as section,
    COUNT(*) as total_june_trips,
    COUNT(CASE WHEN status IN ('completed', 'pending', 'upcoming', 'confirmed') THEN 1 END) as billable_trips,
    STRING_AGG(DISTINCT status, ', ') as statuses_found
FROM trips 
WHERE pickup_time >= '2025-06-01T00:00:00.000Z' 
    AND pickup_time <= '2025-06-31T23:59:59.999Z';
