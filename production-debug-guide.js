#!/usr/bin/env node

// Direct production database check
console.log('🔍 PRODUCTION DATABASE DIRECT CHECK');
console.log('===================================');
console.log('');

// The specific queries we need to run in production Supabase SQL Editor
console.log('📊 RUN THESE QUERIES IN SUPABASE SQL EDITOR:');
console.log('');

console.log('1️⃣ CHECK FACILITY USERS:');
console.log('SELECT id, first_name, last_name, email, facility_id FROM profiles WHERE facility_id = \'e1b94bde-d092-4ce6-b78c-9cff1d0118a3\';');
console.log('');

console.log('2️⃣ CHECK ALL TRIPS FOR FACILITY USERS:');
console.log(`SELECT t.id, t.pickup_time, t.price, t.status, t.user_id, p.first_name, p.last_name
FROM trips t 
JOIN profiles p ON t.user_id = p.id 
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
ORDER BY t.pickup_time DESC;`);
console.log('');

console.log('3️⃣ CHECK JUNE 2025 TRIPS SPECIFICALLY:');
console.log(`SELECT t.id, t.pickup_time, t.price, t.status, t.pickup_address, t.destination_address
FROM trips t 
JOIN profiles p ON t.user_id = p.id 
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
  AND t.pickup_time >= '2025-06-01T00:00:00Z'
  AND t.pickup_time <= '2025-06-30T23:59:59Z'
  AND t.status IN ('completed', 'pending', 'upcoming')
  AND t.price IS NOT NULL
  AND t.price > 0
ORDER BY t.pickup_time DESC;`);
console.log('');

console.log('4️⃣ ADD TEST TRIPS IF NONE EXIST:');
console.log('-- First check if facility has users:');
console.log('SELECT COUNT(*) as user_count FROM profiles WHERE facility_id = \'e1b94bde-d092-4ce6-b78c-9cff1d0118a3\';');
console.log('');
console.log('-- If users exist but no trips, add test trips:');
console.log(`INSERT INTO trips (user_id, pickup_address, destination_address, pickup_time, status, price)
SELECT 
  p.id,
  '123 Test St, Columbus, OH',
  'Test Hospital, Columbus, OH',
  '2025-06-22T10:00:00Z',
  'completed',
  45.50
FROM profiles p 
WHERE p.facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' 
LIMIT 1;`);
console.log('');

console.log('5️⃣ CHECK COMPONENT LOGIC:');
console.log('If trips exist but still not showing, the issue is likely:');
console.log('- Facility ID mismatch in the component');
console.log('- Date range calculation issue');
console.log('- Status filter blocking trips');
console.log('- Client-side JavaScript error');
console.log('');

console.log('🔧 IMMEDIATE FIX:');
console.log('1. Run query #1 to confirm facility has users');
console.log('2. Run query #2 to see all trips for facility');
console.log('3. Run query #3 to see June 2025 trips specifically');
console.log('4. If no trips, run the INSERT query in #4');
console.log('5. Check browser console for JavaScript errors');
console.log('');

console.log('📱 BROWSER DEBUGGING:');
console.log('1. Open browser dev tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Refresh the billing page');
console.log('4. Look for console.log messages from fetchMonthlyTrips');
console.log('5. Check for any error messages');
console.log('');

console.log('🎯 EXPECTED CONSOLE OUTPUT:');
console.log('🔍 fetchMonthlyTrips called with: {selectedMonth: "2025-06", facilityId: "..."}');
console.log('📅 Date range: {startDate: "2025-06-01T...", endDate: "2025-06-30T..."}');
console.log('👥 Facility users query result: {facilityUsers: [...], facilityUsersError: null}');
console.log('🆔 Facility user IDs: ["user-id-1", "user-id-2", ...]');
console.log('🚗 Trips query result: {trips: 5, error: "none", sampleTrip: {...}}');
console.log('💰 Calculated total: 196.25');
