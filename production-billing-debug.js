#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugProductionBilling() {
  console.log('🔍 DEBUGGING PRODUCTION BILLING ISSUE');
  console.log('====================================');
  console.log('Current Date: June 22, 2025');
  console.log('');
  
  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Check current month (June 2025)
    console.log('1️⃣ Setting up date range for June 2025...');
    const selectedMonth = '2025-06';
    const startDate = new Date(selectedMonth + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    console.log(`   Start: ${startDate.toISOString()}`);
    console.log(`   End: ${endDate.toISOString()}`);
    
    // Get facility info
    console.log('\n2️⃣ Checking facility information...');
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('name, billing_email, address, phone_number')
      .eq('id', facilityId)
      .single();
    
    if (facilityError) {
      console.log('❌ Facility Error:', facilityError.message);
      return;
    }
    
    console.log(`✅ Facility: ${facility.name}`);
    console.log(`   Email: ${facility.billing_email}`);
    
    // Get facility users
    console.log('\n3️⃣ Getting facility users...');
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('facility_id', facilityId);
    
    if (facilityUsersError) {
      console.log('❌ Users Error:', facilityUsersError.message);
      return;
    }
    
    console.log(`✅ Found ${facilityUsers?.length || 0} facility users:`);
    facilityUsers?.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (${user.id}) - ${user.email}`);
    });
    
    if (!facilityUsers || facilityUsers.length === 0) {
      console.log('❌ NO FACILITY USERS FOUND - This is the problem!');
      console.log('   Need to check if users are properly assigned to facility');
      return;
    }
    
    const facilityUserIds = facilityUsers.map(user => user.id);
    
    // Check ALL trips for these users (no date filter)
    console.log('\n4️⃣ Checking ALL trips for facility users...');
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, pickup_address, destination_address, price, status, user_id')
      .in('user_id', facilityUserIds)
      .order('pickup_time', { ascending: false });
    
    if (allTripsError) {
      console.log('❌ All Trips Error:', allTripsError.message);
    } else {
      console.log(`✅ Found ${allTrips?.length || 0} total trips for facility users:`);
      allTrips?.slice(0, 10).forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        console.log(`   - Trip ${trip.id}: ${tripDate.toDateString()} | $${trip.price} | ${trip.status}`);
        console.log(`     From: ${trip.pickup_address}`);
        console.log(`     To: ${trip.destination_address}`);
      });
      
      if (allTrips?.length > 10) {
        console.log(`   ... and ${allTrips.length - 10} more trips`);
      }
    }
    
    // Check trips for June 2025 specifically
    console.log('\n5️⃣ Checking trips for June 2025...');
    const { data: monthlyTrips, error: monthlyError } = await supabase
      .from('trips')
      .select('id, pickup_time, pickup_address, destination_address, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .order('pickup_time', { ascending: false });
    
    if (monthlyError) {
      console.log('❌ Monthly Trips Error:', monthlyError.message);
    } else {
      console.log(`✅ Found ${monthlyTrips?.length || 0} trips for June 2025:`);
      monthlyTrips?.forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        console.log(`   - Trip ${trip.id}: ${tripDate.toDateString()} | $${trip.price} | ${trip.status}`);
      });
    }
    
    // Check with all filters (same as component)
    console.log('\n6️⃣ Checking with component filters (completed, pending, upcoming)...');
    const { data: filteredTrips, error: filteredError } = await supabase
      .from('trips')
      .select('id, pickup_time, pickup_address, destination_address, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .in('status', ['completed', 'pending', 'upcoming'])
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });
    
    if (filteredError) {
      console.log('❌ Filtered Trips Error:', filteredError.message);
    } else {
      console.log(`✅ Found ${filteredTrips?.length || 0} filtered trips:`);
      filteredTrips?.forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        console.log(`   - Trip ${trip.id}: ${tripDate.toDateString()} | $${trip.price} | ${trip.status}`);
      });
      
      if (filteredTrips && filteredTrips.length > 0) {
        const total = filteredTrips.reduce((sum, trip) => sum + parseFloat(trip.price), 0);
        console.log(`   💰 Total Amount: $${total.toFixed(2)}`);
      }
    }
    
    // Check managed clients
    console.log('\n7️⃣ Checking managed clients...');
    try {
      const { data: managedClients, error: managedClientsError } = await supabase
        .from('managed_clients')
        .select('id, name')
        .eq('facility_id', facilityId);
      
      if (managedClientsError) {
        console.log('❌ Managed Clients Error:', managedClientsError.message);
      } else {
        console.log(`✅ Found ${managedClients?.length || 0} managed clients:`);
        managedClients?.forEach(client => {
          console.log(`   - ${client.name} (${client.id})`);
        });
        
        if (managedClients && managedClients.length > 0) {
          const clientIds = managedClients.map(c => c.id);
          
          // Check trips for managed clients
          const { data: clientTrips, error: clientTripsError } = await supabase
            .from('trips')
            .select('id, pickup_time, price, status, managed_client_id')
            .in('managed_client_id', clientIds)
            .gte('pickup_time', startDate.toISOString())
            .lte('pickup_time', endDate.toISOString());
          
          if (clientTripsError) {
            console.log('❌ Client Trips Error:', clientTripsError.message);
          } else {
            console.log(`✅ Found ${clientTrips?.length || 0} trips for managed clients in June 2025`);
          }
        }
      }
    } catch (error) {
      console.log('ℹ️ Managed clients table not available or accessible');
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    if (!facilityUsers || facilityUsers.length === 0) {
      console.log('🚨 PROBLEM: No users found for facility');
      console.log('   SOLUTION: Need to assign users to facility or check facility_id');
    } else if (!filteredTrips || filteredTrips.length === 0) {
      console.log('🚨 PROBLEM: No trips found for June 2025 with required filters');
      console.log('   SOLUTION: Need to add trips or adjust date range');
    } else {
      console.log('✅ Everything looks correct - trips should be displaying');
    }
    
  } catch (err) {
    console.error('❌ Debug script error:', err);
  }
}

// Run the debug
debugProductionBilling();
