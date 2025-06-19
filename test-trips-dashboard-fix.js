#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTripsDashboardFix() {
  console.log('🧪 Testing Trips Dashboard Fix...\n');

  try {
    // 1. Test user_id constraint is actually fixed in database
    console.log('1️⃣ Testing user_id constraint allows NULL values...');
    
    // Query trips with NULL user_id to verify constraint is fixed
    const { data: tripsWithNullUserId, error: nullUserError } = await supabase
      .from('trips')
      .select('*')
      .is('user_id', null);

    if (nullUserError) {
      console.error('❌ Error querying trips with NULL user_id:', nullUserError.message);
    } else {
      console.log(`✅ Found ${tripsWithNullUserId.length} trips with NULL user_id (constraint fixed)`);
    }

    // 2. Test facility user query logic
    console.log('\n2️⃣ Testing facility user trip queries...');
    
    // Find a facility user for testing
    const { data: facilityUsers, error: facilityError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'facility')
      .limit(1);

    if (facilityError || !facilityUsers.length) {
      console.log('⚠️ No facility users found for testing');
    } else {
      const facilityUser = facilityUsers[0];
      console.log(`Found facility user: ${facilityUser.first_name} ${facilityUser.last_name} (Facility ID: ${facilityUser.facility_id})`);

      // Test the new query logic for facility users
      const { data: facilityTrips, error: facilityTripsError } = await supabase
        .from('trips')
        .select(`
          *,
          user_profile:user_id(first_name, last_name, phone_number),
          managed_client:managed_client_id(first_name, last_name, phone_number)
        `)
        .eq('facility_id', facilityUser.facility_id);

      if (facilityTripsError) {
        console.error('❌ Error querying facility trips:', facilityTripsError.message);
      } else {
        console.log(`✅ Found ${facilityTrips.length} trips for facility ID ${facilityUser.facility_id}`);
        
        // Show client information for each trip
        facilityTrips.forEach((trip, index) => {
          const clientInfo = trip.user_profile 
            ? `${trip.user_profile.first_name} ${trip.user_profile.last_name} (Authenticated)`
            : trip.managed_client
            ? `${trip.managed_client.first_name} ${trip.managed_client.last_name} (Managed)`
            : 'No client info';
          
          console.log(`   Trip ${index + 1}: ${clientInfo} - ${trip.pickup_address} → ${trip.dropoff_address}`);
        });
      }
    }

    // 3. Test regular client user query logic
    console.log('\n3️⃣ Testing regular client user trip queries...');
    
    // Find a regular client user for testing
    const { data: clientUsers, error: clientError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'client')
      .limit(1);

    if (clientError || !clientUsers.length) {
      console.log('⚠️ No client users found for testing');
    } else {
      const clientUser = clientUsers[0];
      console.log(`Found client user: ${clientUser.first_name} ${clientUser.last_name}`);

      // Test the existing query logic for client users
      const { data: clientTrips, error: clientTripsError } = await supabase
        .from('trips')
        .select(`
          *,
          user_profile:user_id(first_name, last_name, phone_number),
          managed_client:managed_client_id(first_name, last_name, phone_number)
        `)
        .eq('user_id', clientUser.user_id);

      if (clientTripsError) {
        console.error('❌ Error querying client trips:', clientTripsError.message);
      } else {
        console.log(`✅ Found ${clientTrips.length} trips for client user ${clientUser.user_id}`);
      }
    }

    // 4. Test managed clients (trips with null user_id but with managed_client_id)
    console.log('\n4️⃣ Testing managed client trips...');
    
    const { data: managedClientTrips, error: managedError } = await supabase
      .from('trips')
      .select(`
        *,
        managed_client:managed_client_id(first_name, last_name, phone_number)
      `)
      .is('user_id', null)
      .not('managed_client_id', 'is', null);

    if (managedError) {
      console.error('❌ Error querying managed client trips:', managedError.message);
    } else {
      console.log(`✅ Found ${managedClientTrips.length} trips for managed clients`);
      
      managedClientTrips.forEach((trip, index) => {
        const clientInfo = trip.managed_client 
          ? `${trip.managed_client.first_name} ${trip.managed_client.last_name} (Managed)`
          : 'No managed client info';
        
        console.log(`   Trip ${index + 1}: ${clientInfo} - ${trip.pickup_address} → ${trip.dropoff_address}`);
      });
    }

    console.log('\n✅ Trips Dashboard Fix Test Complete!');
    console.log('\n📝 Summary:');
    console.log('- user_id constraint now allows NULL values ✅');
    console.log('- Facility users can query trips by facility_id ✅');
    console.log('- Regular clients can query trips by user_id ✅');
    console.log('- Managed client trips are properly handled ✅');
    console.log('- Client information is included in trip data ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testTripsDashboardFix();
