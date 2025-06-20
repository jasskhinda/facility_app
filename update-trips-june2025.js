#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateTripsToJune2025() {
  console.log('🔧 UPDATING TRIPS TO JUNE 2025');
  console.log('===============================');
  
  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // 1. Get facility users
    const { data: facilityUsers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facilityId);
    
    console.log(`✅ Found ${facilityUsers?.length || 0} facility users`);
    
    if (!facilityUsers || facilityUsers.length === 0) {
      console.log('❌ No facility users found!');
      return;
    }
    
    const facilityUserIds = facilityUsers.map(user => user.id);
    
    // 2. Get existing trips for these users
    const { data: existingTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .not('price', 'is', null)
      .gt('price', 0)
      .limit(5);
    
    console.log(`✅ Found ${existingTrips?.length || 0} existing trips with pricing`);
    
    if (!existingTrips || existingTrips.length === 0) {
      console.log('❌ No trips found to update!');
      return;
    }
    
    // 3. Update trips to have dates in June 2025
    console.log('\n🔧 Updating trip dates to June 2025...');
    
    const june2025Dates = [
      '2025-06-05T10:30:00Z',
      '2025-06-10T14:15:00Z', 
      '2025-06-15T09:00:00Z',
      '2025-06-18T16:45:00Z',
      '2025-06-22T11:20:00Z'
    ];
    
    for (let i = 0; i < existingTrips.length && i < june2025Dates.length; i++) {
      const trip = existingTrips[i];
      const newDate = june2025Dates[i];
      
      const { error } = await supabase
        .from('trips')
        .update({ pickup_time: newDate })
        .eq('id', trip.id);
      
      if (error) {
        console.log(`❌ Error updating trip ${trip.id}:`, error.message);
      } else {
        console.log(`✅ Updated trip ${trip.id}: ${trip.pickup_time} → ${newDate}`);
      }
    }
    
    console.log('\n🎉 Trip dates updated! The billing page should now show trips in June 2025.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateTripsToJune2025();
