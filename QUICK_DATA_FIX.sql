-- QUICK FIX: Add Dashboard and Billing Test Data
-- Run this in your database console to fix both issues

-- 1. Activate all facility clients
UPDATE profiles 
SET status = 'active' 
WHERE facility_id IS NOT NULL AND role = 'facility';

-- 2. Add recent trips for dashboard (last 5 days)
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, distance, additional_passengers, created_at)
SELECT 
    p.id,
    'Recent Trip ' || (RANDOM() * 100)::int || ', Columbus, OH',
    'Recent Destination ' || (RANDOM() * 100)::int || ', Columbus, OH',
    NOW() - (RANDOM() * 5 || ' days')::interval,
    CASE (RANDOM() * 3)::int WHEN 0 THEN 'completed' WHEN 1 THEN 'pending' ELSE 'confirmed' END,
    40 + (RANDOM() * 40)::int,
    CASE (RANDOM() * 3)::int WHEN 0 THEN 'no_wheelchair' WHEN 1 THEN 'provided' ELSE 'manual' END,
    RANDOM() > 0.5,
    6 + (RANDOM() * 8)::int,
    (RANDOM() * 3)::int,
    NOW() - (RANDOM() * 5 || ' days')::interval - '1 hour'::interval
FROM profiles p 
WHERE p.facility_id IS NOT NULL AND p.role = 'facility'
LIMIT 10;

-- 3. Add June 2025 trips for billing
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, distance, additional_passengers, created_at)
SELECT 
    p.id,
    'June Medical ' || gs.i || ', Columbus, OH',
    'June Hospital ' || gs.i || ', Columbus, OH',
    ('2025-06-' || LPAD(gs.i::text, 2, '0') || 'T' || LPAD((8 + (gs.i % 10))::text, 2, '0') || ':00:00Z')::timestamp,
    CASE gs.i % 3 WHEN 0 THEN 'completed' WHEN 1 THEN 'completed' ELSE 'pending' END,
    45 + (gs.i * 3.5),
    CASE gs.i % 3 WHEN 0 THEN 'no_wheelchair' WHEN 1 THEN 'provided' ELSE 'manual' END,
    gs.i % 2 = 0,
    8 + gs.i * 0.5,
    gs.i % 3,
    ('2025-06-' || LPAD(gs.i::text, 2, '0') || 'T' || LPAD((7 + (gs.i % 10))::text, 2, '0') || ':00:00Z')::timestamp
FROM profiles p 
CROSS JOIN generate_series(1, 20) gs(i)
WHERE p.facility_id IS NOT NULL AND p.role = 'facility'
LIMIT 20;

-- 4. Add today's trips
INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price, wheelchair_type, is_round_trip, distance, additional_passengers, created_at)
SELECT 
    p.id,
    'Today Medical Center, Columbus, OH',
    'Today Hospital, Columbus, OH',
    '2025-06-23T14:30:00Z',
    'pending',
    55.00,
    'no_wheelchair',
    false,
    9.2,
    0,
    '2025-06-23T13:30:00Z'
FROM profiles p 
WHERE p.facility_id IS NOT NULL AND p.role = 'facility'
LIMIT 2;

-- Verify the fixes
SELECT 'Recent Trips' as check_type, COUNT(*) as count FROM trips WHERE pickup_time >= NOW() - '7 days'::interval
UNION ALL
SELECT 'June 2025 Trips', COUNT(*) FROM trips WHERE pickup_time >= '2025-06-01' AND pickup_time < '2025-07-01'
UNION ALL  
SELECT 'Today Trips', COUNT(*) FROM trips WHERE DATE(pickup_time) = '2025-06-23'
UNION ALL
SELECT 'Active Clients', COUNT(*) FROM profiles WHERE facility_id IS NOT NULL AND role = 'facility' AND status = 'active';
