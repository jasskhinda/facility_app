const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testBillingPageData() {
  console.log('Testing billing page data access...');
  
  const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
  
  try {
    // Test facility info fetch
    console.log('1. Testing facility info fetch...');
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('name, billing_email, address, phone_number')
      .eq('id', facilityId)
      .single();
    
    if (facilityError) {
      console.error('Facility fetch error:', facilityError);
    } else {
      console.log('✓ Facility info:', facility);
    }
    
    // Test trips fetch
    console.log('2. Testing trips fetch...');
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month
    const endDate = new Date();
    
    const { data: trips, error: tripsError } = await supabase
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
        user_id,
        managed_client_id
      `)
      .eq('facility_id', facilityId)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .limit(5);
    
    if (tripsError) {
      console.error('Trips fetch error:', tripsError);
    } else {
      console.log('✓ Sample trips:', trips?.length || 0, 'trips found');
      if (trips && trips.length > 0) {
        console.log('Sample trip:', trips[0]);
      }
    }
    
    console.log('✓ Billing page data access test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBillingPageData();
