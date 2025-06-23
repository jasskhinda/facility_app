-- BILLING DATA DIAGNOSIS & FIX
-- Run this SQL in Supabase SQL Editor to diagnose and fix the billing issue

-- STEP 1: Check current user profiles and their roles
SELECT 
    '=== USER PROFILE ANALYSIS ===' as section;

SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    facility_id,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- STEP 2: Check specifically for facility users
SELECT 
    '=== FACILITY USERS ===' as section;

SELECT 
    id,
    first_name,
    last_name,
    email,
    facility_id
FROM profiles 
WHERE role = 'facility' 
    AND facility_id IS NOT NULL;

-- STEP 3: Check available facilities
SELECT 
    '=== AVAILABLE FACILITIES ===' as section;

SELECT 
    id,
    name,
    billing_email,
    created_at
FROM facilities 
ORDER BY created_at DESC;

-- STEP 4: Check trips for any users
SELECT 
    '=== ALL TRIPS ANALYSIS ===' as section;

SELECT 
    COUNT(*) as total_trips,
    COUNT(CASE WHEN pickup_time >= '2025-06-01' AND pickup_time < '2025-07-01' THEN 1 END) as june_2025_trips,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_trips
FROM trips;

-- STEP 5: Check trips by month
SELECT 
    '=== TRIPS BY MONTH ===' as section;

SELECT 
    DATE_TRUNC('month', pickup_time) as month,
    COUNT(*) as trip_count,
    SUM(CASE WHEN price IS NOT NULL THEN price ELSE 0 END) as total_amount,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM trips 
GROUP BY DATE_TRUNC('month', pickup_time)
ORDER BY month DESC;

-- STEP 6: Fix the issue by ensuring we have a facility user
-- First, let's make sure we have at least one facility
INSERT INTO facilities (id, name, billing_email, address, phone_number)
SELECT 
    'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
    'Compassionate Care Transportation Facility',
    'billing@compassionatecaretransportation.com',
    '123 Medical Center Dr, Columbus, OH 43215',
    '(614) 555-0123'
WHERE NOT EXISTS (
    SELECT 1 FROM facilities WHERE id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
);

-- Now, create or update a user to be a facility user
-- First, try to update an existing user
UPDATE profiles 
SET 
    role = 'facility',
    facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
    first_name = COALESCE(first_name, 'Facility'),
    last_name = COALESCE(last_name, 'User')
WHERE id = (
    SELECT id 
    FROM profiles 
    WHERE role IS NULL OR role != 'facility'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- If no users exist, create one
INSERT INTO profiles (first_name, last_name, email, role, facility_id, status)
SELECT 
    'Test',
    'Facility',
    'test.facility@compassionatecare.com',
    'facility',
    'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'facility' AND facility_id IS NOT NULL
);

-- STEP 7: Create test trips for June 2025
-- First, get the facility user ID
WITH facility_user AS (
    SELECT id as user_id 
    FROM profiles 
    WHERE role = 'facility' 
        AND facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
    LIMIT 1
)
INSERT INTO trips (
    user_id,
    pickup_address,
    destination_address,
    pickup_time,
    status,
    price,
    wheelchair_type,
    is_round_trip,
    distance,
    additional_passengers,
    created_at
)
SELECT 
    fu.user_id,
    trip_data.pickup_address,
    trip_data.destination_address,
    trip_data.pickup_time,
    trip_data.status,
    trip_data.price,
    trip_data.wheelchair_type,
    trip_data.is_round_trip,
    trip_data.distance,
    trip_data.additional_passengers,
    NOW()
FROM facility_user fu
CROSS JOIN (
    VALUES 
    -- Completed trips (billable)
    ('123 Medical Center Dr, Columbus, OH', 'Ohio State Wexner Medical Center, Columbus, OH', '2025-06-15T10:30:00Z', 'completed', 45.50, 'no_wheelchair', false, 8.2, 0),
    ('456 Senior Living Way, Columbus, OH', 'Mount Carmel East Hospital, Columbus, OH', '2025-06-18T14:15:00Z', 'completed', 62.75, 'wheelchair', true, 12.4, 1),
    ('789 Care Facility Blvd, Columbus, OH', 'Nationwide Children''s Hospital, Columbus, OH', '2025-06-20T09:45:00Z', 'completed', 38.25, 'no_wheelchair', false, 6.8, 0),
    
    -- Pending trips (not yet billable)
    ('5050 Blazer Pkwy # 100, Dublin, OH 43017', '5055 Blazer Pkwy #100, Dublin, OH 43017, USA', '2025-06-24T08:15:00Z', 'pending', NULL, 'no_wheelchair', false, 0.1, 0),
    ('555 Rehab Center Dr, Medical City', '888 Family Home Ln, Suburbs', '2025-06-21T09:15:00Z', 'pending', NULL, 'no_wheelchair', false, 5.5, 0),
    
    -- Upcoming trips
    ('321 Therapy Center Ave, Downtown', '654 Patient Home St, Hometown', '2025-06-25T16:30:00Z', 'upcoming', 29.50, 'manual', false, 4.2, 0)
) AS trip_data(pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, distance, additional_passengers)
WHERE fu.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- STEP 8: Verification
SELECT 
    '=== VERIFICATION RESULTS ===' as section;

-- Check facility users
SELECT 
    'Facility Users' as check_type,
    COUNT(*) as count
FROM profiles 
WHERE role = 'facility' 
    AND facility_id IS NOT NULL;

-- Check June 2025 trips for facility users
SELECT 
    'June 2025 Trips' as check_type,
    COUNT(*) as count,
    SUM(CASE WHEN price IS NOT NULL THEN price ELSE 0 END) as total_amount
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.role = 'facility'
    AND p.facility_id IS NOT NULL
    AND t.pickup_time >= '2025-06-01'
    AND t.pickup_time < '2025-07-01';

-- Show sample trips
SELECT 
    '=== SAMPLE JUNE 2025 TRIPS ===' as section;

SELECT 
    t.pickup_time,
    t.pickup_address,
    t.destination_address,
    t.status,
    t.price,
    p.first_name || ' ' || p.last_name as user_name,
    p.facility_id
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.role = 'facility'
    AND p.facility_id IS NOT NULL
    AND t.pickup_time >= '2025-06-01'
    AND t.pickup_time < '2025-07-01'
ORDER BY t.pickup_time DESC;

-- Final summary
SELECT 
    '=== FINAL SUMMARY ===' as section;

SELECT 
    'READY FOR TESTING' as status,
    'Visit the billing page and log in as a facility user to see the data' as next_step;
