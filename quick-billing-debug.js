#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Quick billing debug...');

async function quickDebug() {
  const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
  
  // 1. Get facility users
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('facility_id', facilityId);
  
  console.log('Facility users:', users?.length || 0);
  
  if (users?.length > 0) {
    // 2. Get ALL their trips (no filters)
    const { data: allTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status')
      .in('user_id', users.map(u => u.id));
    
    console.log('Total trips:', allTrips?.length || 0);
    
    // 3. With price filter
    const { data: pricedTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status')
      .in('user_id', users.map(u => u.id))
      .not('price', 'is', null)
      .gt('price', 0);
    
    console.log('Trips with price:', pricedTrips?.length || 0);
    
    if (pricedTrips?.length > 0) {
      console.log('Trip dates:');
      pricedTrips.forEach(trip => {
        console.log(`  ${new Date(trip.pickup_time).toLocaleDateString()} - $${trip.price} - ${trip.status}`);
      });
      
      // Check June 2025 specifically
      const june2025Start = new Date('2025-06-01').toISOString();
      const june2025End = new Date('2025-06-30T23:59:59').toISOString();
      
      const juneTrips = pricedTrips.filter(trip => 
        trip.pickup_time >= june2025Start && trip.pickup_time <= june2025End
      );
      
      console.log('June 2025 trips:', juneTrips.length);
    }
  }
}

quickDebug().catch(console.error);
