-- STEP 2: Update the user to be a facility user
-- IMPORTANT: Replace the UUIDs below with the actual values from Step 1

-- Template (DO NOT RUN AS-IS):
-- UPDATE profiles 
-- SET 
--   facility_id = 'ACTUAL_FACILITY_ID_FROM_STEP1',
--   role = 'facility'
-- WHERE id = 'ACTUAL_USER_ID_FROM_STEP1';

-- Example with placeholder values:
-- UPDATE profiles 
-- SET 
--   facility_id = '12345678-1234-1234-1234-123456789abc',
--   role = 'facility'
-- WHERE id = '87654321-4321-4321-4321-cba987654321';

-- After running the UPDATE, verify it worked:
SELECT 
  p.id,
  p.email,
  p.facility_id,
  p.role,
  p.first_name,
  p.last_name
FROM profiles p
WHERE p.email = 'YOUR_EMAIL_FROM_STEP1';  -- Replace with actual email

-- Then check if trips now appear for billing:
SELECT 
  COUNT(*) as june_trips_for_facility
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE p.facility_id IS NOT NULL
  AND t.pickup_time >= '2025-06-01' 
  AND t.pickup_time < '2025-07-01'
  AND t.status IN ('completed', 'pending', 'upcoming')
  AND t.price IS NOT NULL
  AND t.price > 0;
