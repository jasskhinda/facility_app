#!/usr/bin/env node

console.log('🧪 Quick Billing Data Check');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function quickCheck() {
  console.log('Starting check...');
  
  const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
  
  // 1. Check if we have trips with prices
  const { data: allTrips, error: allTripsError } = await supabase
    .from('trips')
    .select('id, price, user_id')
    .not('price', 'is', null)
    .limit(3);
  
  console.log('All trips with prices:', allTrips?.length);
  
  // 2. Check facility users
  const { data: facilityUsers, error: facilityError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('facility_id', facilityId);
  
  console.log('Facility users:', facilityUsers?.length);
  
  // 3. Check if any trips belong to facility users
  if (facilityUsers?.length > 0 && allTrips?.length > 0) {
    const facilityUserIds = facilityUsers.map(u => u.id);
    const matchingTrips = allTrips.filter(trip => facilityUserIds.includes(trip.user_id));
    console.log('Matching trips:', matchingTrips.length);
    
    if (matchingTrips.length > 0) {
      console.log('✅ SUCCESS: Found billing data!');
      matchingTrips.forEach(trip => {
        console.log(`  Trip ${trip.id}: $${trip.price}`);
      });
    } else {
      console.log('❌ No trips match facility users');
    }
  }
}

quickCheck().catch(console.error);
