const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Trips Dashboard Fix...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

console.log('✅ Environment variables loaded');

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickTest() {
  try {
    console.log('1️⃣ Testing trips with NULL user_id...');
    
    const { data: nullTrips, error: nullError } = await supabase
      .from('trips')
      .select('id, user_id, managed_client_id, facility_id')
      .is('user_id', null)
      .limit(5);

    if (nullError) {
      console.error('❌ Error:', nullError.message);
    } else {
      console.log(`✅ Found ${nullTrips.length} trips with NULL user_id`);
      nullTrips.forEach(trip => {
        console.log(`   Trip ${trip.id}: user_id=${trip.user_id}, managed_client_id=${trip.managed_client_id}, facility_id=${trip.facility_id}`);
      });
    }

    console.log('\n2️⃣ Testing facility user query...');
    
    const { data: facilityUsers, error: facilityError } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, role, facility_id')
      .eq('role', 'facility')
      .limit(1);

    if (facilityError) {
      console.error('❌ Error:', facilityError.message);
    } else if (!facilityUsers.length) {
      console.log('⚠️ No facility users found');
    } else {
      const facilityUser = facilityUsers[0];
      console.log(`✅ Found facility user: ${facilityUser.first_name} ${facilityUser.last_name} (ID: ${facilityUser.facility_id})`);
      
      const { data: facilityTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id, user_id, managed_client_id, facility_id')
        .eq('facility_id', facilityUser.facility_id)
        .limit(5);

      if (tripsError) {
        console.error('❌ Error:', tripsError.message);
      } else {
        console.log(`✅ Found ${facilityTrips.length} trips for facility ${facilityUser.facility_id}`);
      }
    }

    console.log('\n✅ Quick test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();
