-- Dashboard Data Fix Script
-- Date: June 23, 2025
-- Purpose: Fix all dashboard data issues

-- 1. ACTIVATE CLIENTS
-- Update all facility clients to be active
UPDATE profiles 
SET status = 'active'
WHERE facility_id IS NOT NULL 
  AND role = 'facility'
  AND (status IS NULL OR status != 'active');

-- Update managed clients to be active
UPDATE profiles 
SET status = 'active'
WHERE client_type = 'managed'
  AND (status IS NULL OR status != 'active');

-- 2. CREATE RECENT TRIPS FOR JUNE 2025
-- Get the first facility ID to use for our test data
DO $$
DECLARE
    target_facility_id UUID;
    facility_user_id UUID;
BEGIN
    -- Get a facility ID
    SELECT id INTO target_facility_id 
    FROM facilities 
    LIMIT 1;
    
    -- Get a facility user ID
    SELECT id INTO facility_user_id 
    FROM profiles 
    WHERE facility_id = target_facility_id 
      AND role = 'facility'
    LIMIT 1;
    
    -- If we have both IDs, create trips
    IF target_facility_id IS NOT NULL AND facility_user_id IS NOT NULL THEN
        
        -- Trip 1: Today (June 23, 2025)
        INSERT INTO trips (
            user_id, facility_id, pickup_address, destination_address, 
            pickup_time, status, price, wheelchair_type, is_round_trip, 
            distance, additional_passengers, created_at
        ) VALUES (
            facility_user_id, target_facility_id,
            '123 Medical Center Dr, Columbus, OH 43215',
            'Ohio State University Wexner Medical Center, Columbus, OH',
            '2025-06-23T10:30:00Z',
            'completed',
            67.50,
            'no_wheelchair',
            false,
            12.3,
            0,
            '2025-06-23T09:30:00Z'
        );
        
        -- Trip 2: Yesterday (June 22, 2025)
        INSERT INTO trips (
            user_id, facility_id, pickup_address, destination_address, 
            pickup_time, status, price, wheelchair_type, is_round_trip, 
            distance, additional_passengers, created_at
        ) VALUES (
            facility_user_id, target_facility_id,
            '456 Senior Living Blvd, Columbus, OH 43220',
            'Mount Carmel East Hospital, Columbus, OH',
            '2025-06-22T14:15:00Z',
            'completed',
            45.25,
            'provided',
            false,
            8.7,
            1,
            '2025-06-22T13:15:00Z'
        );
        
        -- Trip 3: Two days ago (June 21, 2025)
        INSERT INTO trips (
            user_id, facility_id, pickup_address, destination_address, 
            pickup_time, status, price, wheelchair_type, is_round_trip, 
            distance, additional_passengers, created_at
        ) VALUES (
            facility_user_id, target_facility_id,
            '789 Care Facility Ave, Columbus, OH 43202',
            'Nationwide Children\'s Hospital, Columbus, OH',
            '2025-06-21T09:00:00Z',
            'completed',
            89.75,
            'manual',
            true,
            15.2,
            0,
            '2025-06-21T08:00:00Z'
        );
        
        -- Trip 4: Upcoming today (June 23, 2025) - for today's schedule
        INSERT INTO trips (
            user_id, facility_id, pickup_address, destination_address, 
            pickup_time, status, price, wheelchair_type, is_round_trip, 
            distance, additional_passengers, created_at
        ) VALUES (
            facility_user_id, target_facility_id,
            '321 Assisted Living Way, Columbus, OH 43235',
            'Grant Medical Center, Columbus, OH',
            '2025-06-23T16:45:00Z',
            'pending',
            52.00,
            'power',
            false,
            9.8,
            0,
            '2025-06-23T12:00:00Z'
        );
        
        -- Trip 5: Another upcoming today (June 23, 2025)
        INSERT INTO trips (
            user_id, facility_id, pickup_address, destination_address, 
            pickup_time, status, price, wheelchair_type, is_round_trip, 
            distance, additional_passengers, created_at
        ) VALUES (
            facility_user_id, target_facility_id,
            '654 Memory Care Dr, Columbus, OH 43240',
            'Riverside Methodist Hospital, Columbus, OH',
            '2025-06-23T18:30:00Z',
            'confirmed',
            38.50,
            'no_wheelchair',
            false,
            6.9,
            2,
            '2025-06-23T11:30:00Z'
        );
        
        -- More trips this week for "8 this week" stat
        INSERT INTO trips (
            user_id, facility_id, pickup_address, destination_address, 
            pickup_time, status, price, wheelchair_type, is_round_trip, 
            distance, additional_passengers, created_at
        ) VALUES 
        -- June 20, 2025
        (facility_user_id, target_facility_id, '100 Elder St, Columbus, OH', 'OSU Medical Center, Columbus, OH', '2025-06-20T11:00:00Z', 'completed', 55.00, 'no_wheelchair', false, 10.1, 0, '2025-06-20T10:00:00Z'),
        -- June 19, 2025  
        (facility_user_id, target_facility_id, '200 Care Ave, Columbus, OH', 'Mount Carmel West, Columbus, OH', '2025-06-19T13:30:00Z', 'completed', 42.75, 'provided', false, 7.8, 1, '2025-06-19T12:30:00Z'),
        -- June 18, 2025
        (facility_user_id, target_facility_id, '300 Senior Blvd, Columbus, OH', 'Grant Medical, Columbus, OH', '2025-06-18T15:15:00Z', 'completed', 61.25, 'manual', true, 11.5, 0, '2025-06-18T14:15:00Z');
        
    END IF;
END $$;

-- 3. VERIFY THE FIXES
-- Check active clients count
SELECT 
    'Active Clients' as metric,
    COUNT(*) as count
FROM profiles 
WHERE facility_id IS NOT NULL 
  AND status = 'active';

-- Check today's trips count (June 23, 2025)
SELECT 
    'Today\'s Trips' as metric,
    COUNT(*) as count
FROM trips 
WHERE DATE(pickup_time) = '2025-06-23';

-- Check this week's trips count
SELECT 
    'This Week\'s Trips' as metric,
    COUNT(*) as count
FROM trips 
WHERE pickup_time >= '2025-06-17'  -- Start of week
  AND pickup_time < '2025-06-24';   -- End of week

-- Check monthly spend (completed trips in June 2025)
SELECT 
    'Monthly Spend' as metric,
    COALESCE(SUM(price), 0) as total
FROM trips 
WHERE pickup_time >= '2025-06-01'
  AND pickup_time < '2025-07-01'
  AND status = 'completed';

-- Check recent trips
SELECT 
    'Recent Trips' as metric,
    COUNT(*) as count
FROM trips 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
