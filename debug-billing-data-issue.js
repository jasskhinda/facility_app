#!/usr/bin/env node

/**
 * Debug Billing Data Issue
 * Investigate why trips aren't showing up in the billing component
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBillingDataIssue() {
  console.log('🔍 DEBUGGING BILLING DATA ISSUE');
  console.log('================================');

  try {
    // 1. Check what facility users exist
    console.log('\n1️⃣ Checking facility users...');
    const { data: facilityUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, facility_id, role')
      .eq('role', 'facility')
      .not('facility_id', 'is', null);

    if (usersError) {
      console.error('❌ Error fetching facility users:', usersError.message);
      return;
    }

    console.log(`✅ Found ${facilityUsers?.length || 0} facility users:`);
    facilityUsers?.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`     User ID: ${user.id}`);
      console.log(`     Facility ID: ${user.facility_id}`);
    });

    if (!facilityUsers?.length) {
      console.log('⚠️ No facility users found - this is the problem!');
      return;
    }

    const userIds = facilityUsers.map(u => u.id);

    // 2. Check ALL trips for these users
    console.log('\n2️⃣ Checking ALL trips for facility users...');
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id, pickup_address, destination_address')
      .in('user_id', userIds)
      .order('pickup_time', { ascending: false });

    if (allTripsError) {
      console.error('❌ Error fetching all trips:', allTripsError.message);
      return;
    }

    console.log(`✅ Found ${allTrips?.length || 0} total trips for facility users`);
    
    if (allTrips?.length > 0) {
      console.log('\n📅 Trip breakdown by month:');
      const tripsByMonth = {};
      
      allTrips.forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        const monthKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = tripDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        if (!tripsByMonth[monthKey]) {
          tripsByMonth[monthKey] = { name: monthName, trips: [] };
        }
        tripsByMonth[monthKey].trips.push(trip);
      });

      Object.entries(tripsByMonth).forEach(([monthKey, monthData]) => {
        console.log(`   ${monthData.name}: ${monthData.trips.length} trips`);
        monthData.trips.slice(0, 2).forEach(trip => {
          console.log(`     - ${trip.pickup_time} | $${trip.price || 'NULL'} | ${trip.status}`);
        });
      });
    }

    // 3. Specifically check June 2025 with exact query from component
    console.log('\n3️⃣ Testing exact June 2025 query from component...');
    
    const startDate = new Date('2025-06-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('📅 Date range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    const { data: june2025Trips, error: juneError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        price,
        wheelchair_type,
        is_round_trip,
        additional_passengers,
        status,
        user_id
      `)
      .in('user_id', userIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .in('status', ['completed', 'pending', 'upcoming', 'confirmed'])
      .order('pickup_time', { ascending: false });

    if (juneError) {
      console.error('❌ Error with June 2025 query:', juneError.message);
      return;
    }

    console.log(`✅ June 2025 trips found: ${june2025Trips?.length || 0}`);
    
    if (june2025Trips?.length > 0) {
      console.log('\n🎯 June 2025 trip details:');
      june2025Trips.forEach(trip => {
        console.log(`   Trip ${trip.id}:`);
        console.log(`     Date: ${trip.pickup_time}`);
        console.log(`     Status: ${trip.status}`);
        console.log(`     Price: $${trip.price || 'NULL'}`);
        console.log(`     Route: ${trip.pickup_address} → ${trip.destination_address}`);
        console.log(`     User ID: ${trip.user_id}`);
      });
    } else {
      console.log('❌ No June 2025 trips found with component query');
      
      // 4. Try without status filter
      console.log('\n4️⃣ Testing without status filter...');
      const { data: allJuneTrips, error: allJuneError } = await supabase
        .from('trips')
        .select('id, pickup_time, price, status, user_id')
        .in('user_id', userIds)
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString());

      if (!allJuneError && allJuneTrips?.length > 0) {
        console.log(`✅ Found ${allJuneTrips.length} June trips without status filter:`);
        allJuneTrips.forEach(trip => {
          console.log(`     - Status: "${trip.status}" | Price: $${trip.price || 'NULL'}`);
        });
      }
    }

    // 5. Check if our test data was actually created
    console.log('\n5️⃣ Checking for our test data...');
    const { data: testDataTrips, error: testError } = await supabase
      .from('trips')
      .select('id, pickup_time, pickup_address, status, price')
      .ilike('pickup_address', '%5050 Blazer%')
      .or('pickup_address.ilike.%Medical Center Dr%,pickup_address.ilike.%Senior Living Way%');

    if (!testError && testDataTrips?.length > 0) {
      console.log(`✅ Found ${testDataTrips.length} test data trips:`);
      testDataTrips.forEach(trip => {
        console.log(`     - ${trip.pickup_time} | ${trip.pickup_address} | ${trip.status}`);
      });
    } else {
      console.log('❌ No test data found - need to create it');
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

// Run the debug
debugBillingDataIssue().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
