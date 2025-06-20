#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTripDates() {
  console.log('🔍 CHECKING TRIP DATES & AVAILABILITY');
  console.log('====================================');
  
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
    console.log('User IDs:', facilityUserIds);
    
    // 2. Get ALL trips for these users (no date filter)
    const { data: allTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });
    
    console.log(`\n✅ Found ${allTrips?.length || 0} total trips with pricing`);
    
    if (allTrips && allTrips.length > 0) {
      console.log('\n📅 Trip dates and details:');
      allTrips.forEach((trip, index) => {
        const tripDate = new Date(trip.pickup_time);
        const monthYear = tripDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        console.log(`${index + 1}. ${tripDate.toDateString()} (${monthYear}) - $${trip.price} - ${trip.status}`);
      });
      
      // Check June 2025 specifically
      const june2025Trips = allTrips.filter(trip => {
        const tripDate = new Date(trip.pickup_time);
        return tripDate.getFullYear() === 2025 && tripDate.getMonth() === 5; // June = month 5
      });
      
      console.log(`\n🎯 June 2025 trips: ${june2025Trips.length}`);
      
      if (june2025Trips.length === 0) {
        console.log('❌ NO TRIPS IN JUNE 2025 - This explains the 0 trips issue!');
        
        // Show what months DO have trips
        const monthCounts = {};
        allTrips.forEach(trip => {
          const tripDate = new Date(trip.pickup_time);
          const monthYear = tripDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
        });
        
        console.log('\n📊 Trips by month:');
        Object.entries(monthCounts).forEach(([month, count]) => {
          console.log(`   ${month}: ${count} trips`);
        });
        
        console.log('\n💡 SOLUTION: Change the selected month to one that has trips!');
      }
    } else {
      console.log('❌ No trips found at all!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTripDates();
