-- BILLING TRIPS MISMATCH - TARGETED FIX
-- This will fix the issue where trips exist but don't show in billing

-- STEP 1: Identify the current user and their trips
SELECT 
    'CURRENT SITUATION ANALYSIS' as section;

-- Check all users and their trips
SELECT 
    u.email,
    p.role,
    p.facility_id,
    COUNT(t.id) as trip_count,
    COUNT(CASE WHEN t.pickup_time >= '2025-06-01' AND t.pickup_time < '2025-07-01' THEN 1 END) as june_trips
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN trips t ON t.user_id = p.id
GROUP BY u.email, p.role, p.facility_id
ORDER BY trip_count DESC;

-- STEP 2: Create facility if it doesn't exist
INSERT INTO facilities (id, name, billing_email, address, phone_number, contact_email, facility_type)
VALUES (
    'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
    'Compassionate Care Transportation',
    'billing@compassionatecaretransportation.com',
    '5050 Blazer Pkwy # 100, Dublin, OH 43017',
    '(614) 555-0123',
    'admin@compassionatecaretransportation.com',
    'transportation_service'
)
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Update the user who has trips to be a facility user
-- This will automatically make their trips visible in billing
UPDATE profiles 
SET 
    role = 'facility',
    facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
WHERE id IN (
    -- Find users who have trips but are not facility users
    SELECT DISTINCT t.user_id
    FROM trips t
    JOIN profiles p ON t.user_id = p.id
    WHERE p.role != 'facility' OR p.facility_id IS NULL
);

-- STEP 4: Verify the fix worked
SELECT 
    'VERIFICATION - AFTER FIX' as section;

-- Check user profiles after update
SELECT 
    u.email,
    p.first_name,
    p.last_name,
    p.role,
    p.facility_id,
    f.name as facility_name
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN facilities f ON f.id = p.facility_id
WHERE p.role = 'facility';

-- Check trips that should now be visible in billing
SELECT 
    'TRIPS NOW VISIBLE IN BILLING' as section,
    COUNT(*) as total_trips,
    COUNT(CASE WHEN pickup_time >= '2025-06-01' AND pickup_time < '2025-07-01' THEN 1 END) as june_trips,
    SUM(CASE WHEN pickup_time >= '2025-06-01' AND pickup_time < '2025-07-01' AND price IS NOT NULL THEN price ELSE 0 END) as june_revenue
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';

-- Show specific June trips
SELECT 
    'JUNE 2025 TRIPS DETAILS' as section,
    t.pickup_time,
    t.pickup_address,
    t.destination_address,
    t.status,
    COALESCE(t.price, 0) as price,
    p.first_name || ' ' || p.last_name as user_name
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
    AND t.pickup_time >= '2025-06-01'
    AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time;

-- FINAL MESSAGE
SELECT 
    'SUCCESS MESSAGE' as section,
    'After running this SQL, refresh the billing page and you should see your trips!' as message;
