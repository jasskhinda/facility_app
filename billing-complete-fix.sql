-- COMPREHENSIVE BILLING FIX SCRIPT
-- Run this in Supabase SQL Editor to fix billing issues

-- ======================================
-- STEP 1: DIAGNOSTIC - Check Current State
-- ======================================

SELECT '=== CURRENT USERS ===' as section;
SELECT 
  u.id, 
  u.email, 
  u.created_at,
  u.raw_user_meta_data->>'role' as meta_role
FROM auth.users u 
ORDER BY u.created_at DESC 
LIMIT 10;

SELECT '=== CURRENT PROFILES ===' as section;
SELECT 
  p.id, 
  u.email,
  p.first_name, 
  p.last_name, 
  p.role, 
  p.facility_id,
  p.created_at
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC 
LIMIT 10;

SELECT '=== CURRENT FACILITIES ===' as section;
SELECT 
  id, 
  name, 
  billing_email, 
  created_at
FROM facilities 
ORDER BY created_at DESC;

SELECT '=== CURRENT TRIPS SUMMARY ===' as section;
SELECT 
  DATE_TRUNC('month', pickup_time) as month,
  COUNT(*) as trip_count,
  SUM(CASE WHEN price > 0 THEN price ELSE 0 END) as total_revenue,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM trips
GROUP BY DATE_TRUNC('month', pickup_time)
ORDER BY month DESC;

-- ======================================
-- STEP 2: CREATE REQUIRED INFRASTRUCTURE
-- ======================================

-- Create test facility (if doesn't exist)
INSERT INTO facilities (
  id, 
  name, 
  billing_email, 
  contact_email,
  address, 
  phone_number, 
  facility_type
) VALUES (
  'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
  'Compassionate Care Medical Center',
  'billing@compassionatecare.com',
  'admin@compassionatecare.com',
  '9500 Healthcare Blvd, Medical District, OH 43215',
  '(614) 555-CARE',
  'hospital'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  billing_email = EXCLUDED.billing_email,
  contact_email = EXCLUDED.contact_email,
  address = EXCLUDED.address,
  phone_number = EXCLUDED.phone_number,
  facility_type = EXCLUDED.facility_type;

-- ======================================
-- STEP 3: FIX USER ROLES (CHOOSE ONE OPTION)
-- ======================================

-- OPTION A: Update the most recent user to be facility admin
-- (Use this if you want to convert an existing user)
UPDATE profiles 
SET 
  role = 'facility',
  facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
  first_name = COALESCE(first_name, 'Facility'),
  last_name = COALESCE(last_name, 'Administrator')
WHERE id = (
  SELECT p.id 
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role IS NULL OR p.role != 'facility'
  ORDER BY u.created_at DESC 
  LIMIT 1
)
AND EXISTS (
  SELECT 1 FROM profiles WHERE role IS NULL OR role != 'facility'
);

-- OPTION B: Update specific user by email
-- Uncomment and replace 'your-email@example.com' with your actual email
/*
UPDATE profiles 
SET 
  role = 'facility',
  facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
  first_name = COALESCE(first_name, 'Facility'),
  last_name = COALESCE(last_name, 'Administrator')
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);
*/

-- ======================================
-- STEP 4: CREATE TEST TRIPS FOR JUNE 2025
-- ======================================

-- Get the facility user ID
DO $$
DECLARE
  facility_user_id UUID;
BEGIN
  -- Find a facility user
  SELECT id INTO facility_user_id
  FROM profiles 
  WHERE role = 'facility' 
    AND facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
  LIMIT 1;
  
  -- Only create trips if we have a facility user
  IF facility_user_id IS NOT NULL THEN
    -- Delete existing test trips to avoid duplicates
    DELETE FROM trips 
    WHERE user_id = facility_user_id 
      AND pickup_time >= '2025-06-01T00:00:00Z'
      AND pickup_time < '2025-07-01T00:00:00Z';
    
    -- Create Trip 1: Emergency transport
    INSERT INTO trips (
      user_id, 
      pickup_address, 
      destination_address, 
      pickup_time, 
      status, 
      price, 
      wheelchair_type, 
      is_round_trip,
      notes
    ) VALUES (
      facility_user_id,
      'Cleveland Clinic Main Campus, 9500 Euclid Ave, Cleveland, OH 44195',
      '1847 Residential Dr, Cleveland Heights, OH 44106',
      '2025-06-03T08:30:00Z',
      'completed',
      42.75,
      'no_wheelchair',
      false,
      'Routine follow-up appointment'
    );
    
    -- Create Trip 2: Dialysis transport
    INSERT INTO trips (
      user_id, 
      pickup_address, 
      destination_address, 
      pickup_time, 
      status, 
      price, 
      wheelchair_type, 
      is_round_trip,
      notes
    ) VALUES (
      facility_user_id,
      '5678 Patient Avenue, Lakewood, OH 44107',
      'MetroHealth Dialysis Center, 2500 MetroHealth Dr, Cleveland, OH 44109',
      '2025-06-10T06:00:00Z',
      'completed',
      38.50,
      'manual_wheelchair',
      true,
      'Dialysis treatment - wheelchair accessible vehicle required'
    );
    
    -- Create Trip 3: Specialist appointment
    INSERT INTO trips (
      user_id, 
      pickup_address, 
      destination_address, 
      pickup_time, 
      status, 
      price, 
      wheelchair_type, 
      is_round_trip,
      notes
    ) VALUES (
      facility_user_id,
      'Senior Living Center, 3421 Retirement Blvd, Westlake, OH 44145',
      'University Hospitals Seidman Cancer Center, 11100 Euclid Ave, Cleveland, OH 44106',
      '2025-06-15T13:15:00Z',
      'completed',
      65.25,
      'no_wheelchair',
      false,
      'Oncology consultation - extended appointment'
    );
    
    -- Create Trip 4: Physical therapy
    INSERT INTO trips (
      user_id, 
      pickup_address, 
      destination_address, 
      pickup_time, 
      status, 
      price, 
      wheelchair_type, 
      is_round_trip,
      notes
    ) VALUES (
      facility_user_id,
      '9876 Assisted Living Way, Parma, OH 44134',
      'Rehabilitation Institute, 1234 Therapy Lane, Independence, OH 44131',
      '2025-06-20T10:45:00Z',
      'pending',
      0.00,
      'electric_wheelchair',
      true,
      'Physical therapy session - power wheelchair transport'
    );
    
    -- Create Trip 5: Routine checkup
    INSERT INTO trips (
      user_id, 
      pickup_address, 
      destination_address, 
      pickup_time, 
      status, 
      price, 
      wheelchair_type, 
      is_round_trip,
      notes
    ) VALUES (
      facility_user_id,
      '4567 Healthcare Complex, Strongsville, OH 44136',
      'Family Medicine Associates, 7890 Primary Care Dr, Middleburg Heights, OH 44130',
      '2025-06-25T14:00:00Z',
      'upcoming',
      0.00,
      'no_wheelchair',
      false,
      'Annual wellness visit - scheduled'
    );
    
    -- Create Trip 6: Emergency room visit
    INSERT INTO trips (
      user_id, 
      pickup_address, 
      destination_address, 
      pickup_time, 
      status, 
      price, 
      wheelchair_type, 
      is_round_trip,
      notes
    ) VALUES (
      facility_user_id,
      '2345 Nursing Home Dr, Berea, OH 44017',
      'Southwest General Hospital Emergency Dept, 18697 Bagley Rd, Middleburg Heights, OH 44130',
      '2025-06-28T16:30:00Z',
      'confirmed',
      0.00,
      'manual_wheelchair',
      false,
      'Emergency transport - wheelchair required'
    );
    
    RAISE NOTICE 'Successfully created test trips for facility user: %', facility_user_id;
  ELSE
    RAISE NOTICE 'No facility user found - trips not created';
  END IF;
END $$;

-- ======================================
-- STEP 5: VERIFICATION
-- ======================================

SELECT '=== VERIFICATION: FACILITY USERS ===' as section;
SELECT 
  p.id, 
  u.email,
  p.first_name, 
  p.last_name, 
  p.role, 
  p.facility_id,
  f.name as facility_name
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN facilities f ON f.id = p.facility_id
WHERE p.role = 'facility';

SELECT '=== VERIFICATION: JUNE 2025 TRIPS FOR FACILITY ===' as section;
SELECT 
  t.id,
  t.pickup_time,
  t.pickup_address,
  t.destination_address,
  t.status,
  t.price,
  t.wheelchair_type,
  t.is_round_trip,
  t.notes,
  p.first_name || ' ' || p.last_name as user_name
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
  AND t.pickup_time >= '2025-06-01T00:00:00Z'
  AND t.pickup_time < '2025-07-01T00:00:00Z'
ORDER BY t.pickup_time;

SELECT '=== VERIFICATION: BILLING SUMMARY ===' as section;
SELECT 
  COUNT(*) as total_trips,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
  COUNT(CASE WHEN status IN ('pending', 'upcoming', 'confirmed') THEN 1 END) as pending_trips,
  SUM(CASE WHEN status = 'completed' AND price > 0 THEN price ELSE 0 END) as billable_amount,
  f.name as facility_name,
  f.billing_email
FROM trips t
JOIN profiles p ON t.user_id = p.id
JOIN facilities f ON f.id = p.facility_id
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
  AND t.pickup_time >= '2025-06-01T00:00:00Z'
  AND t.pickup_time < '2025-07-01T00:00:00Z'
GROUP BY f.name, f.billing_email;

-- ======================================
-- FINAL MESSAGE
-- ======================================

SELECT '=== SETUP COMPLETE ===' as section;
SELECT 
  'Billing system is now ready!' as message,
  'Login to the facility app and navigate to /dashboard/billing' as next_step,
  'Select "June 2025" from the month dropdown' as instruction;
