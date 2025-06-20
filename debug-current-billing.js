#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCurrentBilling() {
  console.log('🔍 DEBUGGING CURRENT BILLING ISSUE');
  console.log('==================================');
  console.log('');
  
  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Check current month (June 2025)
    console.log('1️⃣ Checking current month (June 2025)...');
    const currentMonth = '2025-06';
    const startDate = new Date(currentMonth + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    console.log('   Date range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    // Get facility users
    console.log('\n2️⃣ Getting facility users...');
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facilityId);
    
    if (facilityUsersError) {
      console.log('❌ Error getting facility users:', facilityUsersError.message);
      return;
    }
    
    console.log(`✅ Found ${facilityUsers?.length || 0} facility users`);
    facilityUsers?.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (${user.id})`);
    });
    
    if (!facilityUsers || facilityUsers.length === 0) {
      console.log('❌ No facility users found - this is the problem!');
      return;
    }
    
    const facilityUserIds = facilityUsers.map(user => user.id);
    
    // Check ALL trips for these users (no date filter)
    console.log('\n3️⃣ Checking ALL trips for facility users...');
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .not('price', 'is', null)
      .gt('price', 0);
    
    if (allTripsError) {
      console.log('❌ Error getting all trips:', allTripsError.message);
    } else {
      console.log(`✅ Found ${allTrips?.length || 0} total trips with pricing`);
      allTrips?.forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        console.log(`   - Trip ${trip.id}: $${trip.price} | ${tripDate.toDateString()} | ${trip.status}`);
      });
    }
    
    // Check trips for current month specifically
    console.log('\n4️⃣ Checking trips for June 2025...');
    const { data: monthlyTrips, error: monthlyError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .not('price', 'is', null)
      .gt('price', 0);
    
    if (monthlyError) {
      console.log('❌ Error getting monthly trips:', monthlyError.message);
    } else {
      console.log(`✅ Found ${monthlyTrips?.length || 0} trips for June 2025`);
      monthlyTrips?.forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        console.log(`   - Trip ${trip.id}: $${trip.price} | ${tripDate.toDateString()} | ${trip.status}`);
      });
    }
    
    // Check with status filter (same as component)
    console.log('\n5️⃣ Checking with status filter (completed, pending, upcoming)...');
    const { data: statusTrips, error: statusError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .in('status', ['completed', 'pending', 'upcoming'])
      .not('price', 'is', null)
      .gt('price', 0);
    
    if (statusError) {
      console.log('❌ Error getting status-filtered trips:', statusError.message);
    } else {
      console.log(`✅ Found ${statusTriips?.length || 0} trips with status filter`);
      statusTrips?.forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        console.log(`   - Trip ${trip.id}: $${trip.price} | ${tripDate.toDateString()} | ${trip.status}`);
      });
    }
    
    // Check what statuses actually exist
    if (allTrips && allTrips.length > 0) {
      console.log('\n6️⃣ Available trip statuses:');
      const statuses = [...new Set(allTrips.map(trip => trip.status))];
      console.log('   Statuses found:', statuses);
      console.log('   Component filters for:', ['completed', 'pending', 'upcoming']);
      
      const missingStatuses = statuses.filter(status => !['completed', 'pending', 'upcoming'].includes(status));
      if (missingStatuses.length > 0) {
        console.log('   ⚠️  Trips with excluded statuses:', missingStatuses);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCurrentBilling();
