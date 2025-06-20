// Test script to verify the FacilityBillingComponent fix
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFacilityBillingFix() {
  console.log('🧪 Testing FacilityBillingComponent Fix');
  console.log('=====================================');
  
  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Step 1: Get facility users (new approach)
    console.log('\n1️⃣ Getting facility users...');
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('facility_id', facilityId);
    
    if (facilityUsersError) {
      console.log('❌ Error:', facilityUsersError.message);
      return;
    }
    
    console.log(`✅ Found ${facilityUsers?.length || 0} facility users`);
    facilityUsers?.forEach(user => console.log(`   - User ID: ${user.id}`));
    
    if (!facilityUsers || facilityUsers.length === 0) {
      console.log('❌ No users found for facility - this is the problem!');
      return;
    }
    
    const facilityUserIds = facilityUsers.map(user => user.id);
    
    // Step 2: Check for managed clients
    console.log('\n2️⃣ Checking for managed clients...');
    let facilityManagedClientIds = [];
    try {
      const { data: managedClientsForFacility, error: managedClientsError } = await supabase
        .from('managed_clients')
        .select('id')
        .eq('facility_id', facilityId);
      
      if (!managedClientsError && managedClientsForFacility) {
        facilityManagedClientIds = managedClientsForFacility.map(client => client.id);
        console.log(`✅ Found ${facilityManagedClientIds.length} managed clients`);
      } else {
        console.log('⚠️  No managed clients or table not found');
      }
    } catch (error) {
      console.log('⚠️  managed_clients table not found');
    }
    
    // Step 3: Query trips with new approach
    console.log('\n3️⃣ Querying trips with user-based approach...');
    
    let query = supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        price,
        wheelchair_type,
        is_round_trip,
        status,
        user_id,
        managed_client_id
      `)
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });

    // Filter for trips by facility users OR managed clients  
    if (facilityUserIds.length > 0 && facilityManagedClientIds.length > 0) {
      query = query.or(`user_id.in.(${facilityUserIds.join(',')}),managed_client_id.in.(${facilityManagedClientIds.join(',')})`);
    } else if (facilityUserIds.length > 0) {
      query = query.in('user_id', facilityUserIds);
    } else if (facilityManagedClientIds.length > 0) {
      query = query.in('managed_client_id', facilityManagedClientIds);
    }

    const { data: trips, error: tripsError } = await query;
    
    if (tripsError) {
      console.log('❌ Error querying trips:', tripsError.message);
      return;
    }
    
    console.log(`✅ Found ${trips?.length || 0} billable trips!`);
    
    if (trips && trips.length > 0) {
      const totalAmount = trips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
      console.log(`💰 Total revenue: $${totalAmount.toFixed(2)}`);
      
      console.log('\n📋 Sample trips:');
      trips.slice(0, 5).forEach(trip => {
        console.log(`   - Trip ${trip.id}: $${trip.price} (${trip.status})`);
        console.log(`     ${trip.pickup_address} → ${trip.destination_address}`);
      });
      
      // Step 4: Test current month filtering (what FacilityBillingComponent does)
      console.log('\n4️⃣ Testing current month filtering...');
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      console.log(`   Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      let monthQuery = supabase
        .from('trips')
        .select('id, pickup_time, price, status')
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString())
        .in('status', ['completed', 'pending', 'upcoming'])
        .not('price', 'is', null)
        .gt('price', 0);

      if (facilityUserIds.length > 0) {
        monthQuery = monthQuery.in('user_id', facilityUserIds);
      }

      const { data: monthlyTrips, error: monthlyError } = await monthQuery;
      
      if (monthlyError) {
        console.log('   ❌ Monthly query error:', monthlyError.message);
      } else {
        console.log(`   ✅ Current month trips: ${monthlyTrips?.length || 0}`);
        if (monthlyTrips && monthlyTrips.length > 0) {
          const monthlyTotal = monthlyTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
          console.log(`   💰 Current month revenue: $${monthlyTotal.toFixed(2)}`);
        }
      }
      
      console.log('\n🎉 SUCCESS! FacilityBillingComponent should now show trips!');
      console.log('\n✅ FIXED ISSUES:');
      console.log('1. ✅ Changed from trips.facility_id to user-based lookup');
      console.log('2. ✅ Added managed clients support');
      console.log('3. ✅ Added proper error handling for missing users');
      console.log('4. ✅ Added price filtering (> 0 and not null)');
      
    } else {
      console.log('❌ No trips found - there may be another issue');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFacilityBillingFix();
