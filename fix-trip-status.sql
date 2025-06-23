-- URGENT: STATUS MISMATCH FIX
-- Your trips have status 'Pending Approval' but billing expects 'pending'

-- First, let's see what status values exist
SELECT DISTINCT status, COUNT(*) as count
FROM trips 
GROUP BY status
ORDER BY count DESC;

-- Fix the status values to match what billing component expects
UPDATE trips 
SET status = 'pending'
WHERE status = 'Pending Approval';

-- Verify the fix
SELECT 
    'AFTER STATUS FIX' as section,
    status,
    COUNT(*) as count,
    MIN(pickup_time) as earliest,
    MAX(pickup_time) as latest
FROM trips 
WHERE pickup_time >= '2025-06-01' 
    AND pickup_time < '2025-07-01'
GROUP BY status;

-- Show June 2025 trips that should now be visible
SELECT 
    'JUNE 2025 TRIPS READY FOR BILLING' as section,
    pickup_time,
    status,
    pickup_address,
    destination_address
FROM trips 
WHERE pickup_time >= '2025-06-01' 
    AND pickup_time < '2025-07-01'
    AND status IN ('completed', 'pending', 'upcoming', 'confirmed')
ORDER BY pickup_time;
