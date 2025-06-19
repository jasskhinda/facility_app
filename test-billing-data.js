#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBillingData() {
  console.log('🧪 Testing Billing Data...\n');
  
  try {
    // Test 1: Check trips with costs
    console.log('1️⃣ Checking trips with price data...');
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, status, price, pickup_address, destination_address, user_id, managed_client_id, created_at')
      .not('price', 'is', null)
      .gte('price', 0)
      .limit(5);
      
    if (tripsError) {
      console.log('❌ Error fetching trips:', tripsError.message);
    } else {
      console.log(`✅ Found ${trips.length} trips with pricing data`);
      if (trips.length > 0) {
        console.log('📋 Sample trips:');
        trips.forEach(trip => {
          console.log(`   - Trip ${trip.id}: $${trip.price} (${trip.status})`);
        });
      }
    }
    
    // Test 2: Check for facility users
    console.log('\n2️⃣ Checking facility users...');
    const { data: facilityUsers, error: facilityError } = await supabase
      .from('profiles')
      .select('id, role, facility_id')
      .eq('role', 'facility')
      .limit(3);
      
    if (facilityError) {
      console.log('❌ Error fetching facility users:', facilityError.message);
    } else {
      console.log(`✅ Found ${facilityUsers.length} facility users`);
      facilityUsers.forEach(user => {
        console.log(`   - User ${user.id}: facility_id ${user.facility_id}`);
      });
    }
    
    // Test 3: Test the trips-billing API logic manually
    if (facilityUsers.length > 0) {
      console.log('\n3️⃣ Testing trips-billing logic...');
      const facilityId = facilityUsers[0].facility_id;
      
      const { data: facilityTrips, error: facilityTripsError } = await supabase
        .from('trips')
        .select(`
          id,
          pickup_address,
          destination_address,
          pickup_time,
          status,
          price,
          distance,
          wheelchair_type,
          is_round_trip,
          additional_passengers,
          created_at,
          user_id,
          managed_client_id,
          profiles:user_id(id, first_name, last_name),
          managed_clients:managed_client_id(id, first_name, last_name)
        `)
        .or(`user_id.in.(select id from profiles where facility_id=${facilityId}),managed_client_id.in.(select id from managed_clients where facility_id=${facilityId})`)
        .not('price', 'is', null)
        .gte('price', 0)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (facilityTripsError) {
        console.log('❌ Error fetching facility trips:', facilityTripsError.message);
      } else {
        console.log(`✅ Found ${facilityTrips.length} billable trips for facility ${facilityId}`);
        
        if (facilityTrips.length > 0) {
          console.log('📋 Billable trips:');
          facilityTrips.forEach(trip => {
            const clientName = trip.profiles ? 
              `${trip.profiles.first_name} ${trip.profiles.last_name}` :
              trip.managed_clients ? 
              `${trip.managed_clients.first_name} ${trip.managed_clients.last_name}` :
              'Unknown Client';
            console.log(`   - Trip ${trip.id}: $${trip.price} - ${clientName} (${trip.status})`);
          });
        } else {
          console.log('⚠️  No billable trips found for this facility');
        }
      }
    }
    
    console.log('\n✅ Billing data test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBillingData();
