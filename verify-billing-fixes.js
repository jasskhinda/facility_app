// Test script to verify the billing fixes work
// Run this after the fixes are deployed

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBillingFixes() {
  console.log('🧪 Testing Billing Component Fixes...\n');
  
  try {
    // Test 1: Check if we can find facility users
    console.log('📋 Test 1: Finding facility users...');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('profiles')
      .select('facility_id')
      .not('facility_id', 'is', null)
      .limit(1);
    
    if (facilitiesError) {
      console.error('❌ Failed to get facilities:', facilitiesError);
      return;
    }
    
    if (!facilities || facilities.length === 0) {
      console.log('⚠️  No facilities found in profiles table');
      return;
    }
    
    const testFacilityId = facilities[0].facility_id;
    console.log('✅ Found test facility:', testFacilityId);
    
    // Get facility users
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('facility_id', testFacilityId);
    
    if (facilityUsersError) {
      console.error('❌ Failed to get facility users:', facilityUsersError);
      return;
    }
    
    console.log(`✅ Found ${facilityUsers?.length || 0} users in facility`);
    
    if (!facilityUsers || facilityUsers.length === 0) {
      console.log('⚠️  No users found for this facility');
      return;
    }
    
    const facilityUserIds = facilityUsers.map(user => user.id);
    
    // Test 2: Check trips for facility users
    console.log('\n📋 Test 2: Finding trips for facility users...');
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .not('price', 'is', null)
      .gt('price', 0)
      .limit(10);
    
    if (allTripsError) {
      console.error('❌ Failed to get trips:', allTripsError);
      return;
    }
    
    console.log(`✅ Found ${allTrips?.length || 0} trips for facility users`);
    
    if (!allTrips || allTrips.length === 0) {
      console.log('⚠️  No trips found for facility users');
      return;
    }
    
    // Test 3: Test date filtering logic
    console.log('\n📋 Test 3: Testing date filtering logic...');
    
    // Test June 2025 filtering (the month from the issue)
    const selectedMonth = '2025-06';
    const startDate = new Date(selectedMonth + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('📅 Testing date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // Test current filtering logic (should now work)
    const { data: juneTrips, error: juneTripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .in('status', ['completed', 'pending', 'upcoming'])
      .not('price', 'is', null)
      .gt('price', 0);
    
    if (juneTripsError) {
      console.error('❌ June trips query failed:', juneTripsError);
    } else {
      console.log(`✅ June 2025 trips found: ${juneTrips?.length || 0}`);
    }
    
    // Test fallback date-only filtering
    const dateOnlyStart = selectedMonth + '-01';
    const nextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    const dateOnlyEnd = nextMonth.toISOString().split('T')[0];
    
    const { data: juneTripsFallback, error: juneTripsFallbackError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', dateOnlyStart)
      .lt('pickup_time', dateOnlyEnd)
      .in('status', ['completed', 'pending', 'upcoming'])
      .not('price', 'is', null)
      .gt('price', 0);
    
    if (juneTripsFallbackError) {
      console.error('❌ June trips fallback query failed:', juneTripsFallbackError);
    } else {
      console.log(`✅ June 2025 trips (fallback): ${juneTripsFallback?.length || 0}`);
    }
    
    // Test 4: Show trip distribution by month
    console.log('\n📋 Test 4: Trip distribution by month...');
    const tripsByMonth = {};
    
    allTrips.forEach(trip => {
      const date = new Date(trip.pickup_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!tripsByMonth[monthKey]) {
        tripsByMonth[monthKey] = [];
      }
      tripsByMonth[monthKey].push(trip);
    });
    
    Object.entries(tripsByMonth).forEach(([month, trips]) => {
      const total = trips.reduce((sum, trip) => sum + parseFloat(trip.price), 0);
      console.log(`📊 ${month}: ${trips.length} trips, $${total.toFixed(2)}`);
    });
    
    console.log('\n🎉 Billing component test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Facility ID tested: ${testFacilityId}`);
    console.log(`- Users in facility: ${facilityUserIds.length}`);
    console.log(`- Total trips found: ${allTrips.length}`);
    console.log(`- June 2025 trips (primary): ${juneTrips?.length || 0}`);
    console.log(`- June 2025 trips (fallback): ${juneTripsFallback?.length || 0}`);
    console.log(`- Months with trips: ${Object.keys(tripsByMonth).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBillingFixes();
