// Simple script to add test billing data for June 2025
// This will create the minimal data needed for billing to work

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function addTestData() {
  console.log('🚀 Adding test billing data for June 2025...');
  
  try {
    // 1. First, check if we have any facilities
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    if (!facilities || facilities.length === 0) {
      console.log('❌ No facilities found. Creating test facility...');
      
      const { data: newFacility, error: facilityError } = await supabase
        .from('facilities')
        .insert({
          name: 'Test Healthcare Facility',
          billing_email: 'billing@testfacility.com',
          address: '123 Healthcare Dr, Medical City, State 12345',
          phone_number: '(555) 123-4567',
          status: 'active'
        })
        .select()
        .single();
      
      if (facilityError) {
        console.error('❌ Failed to create facility:', facilityError);
        return;
      }
      
      console.log('✅ Created test facility:', newFacility.name);
      facilities.push(newFacility);
    }
    
    const facility = facilities[0];
    console.log('🏥 Using facility:', facility.name);
    
    // 2. Check if we have facility users
    let { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');
    
    if (!users || users.length === 0) {
      console.log('❌ No facility users found. Creating test user...');
      
      // Create a test user profile
      const { data: newUser, error: userError } = await supabase
        .from('profiles')
        .insert({
          first_name: 'John',
          last_name: 'Test Client',
          email: `testclient.${Date.now()}@facility.com`,
          facility_id: facility.id,
          role: 'facility',
          status: 'active',
          client_type: 'facility'
        })
        .select()
        .single();
      
      if (userError) {
        console.error('❌ Failed to create user:', userError);
        return;
      }
      
      console.log('✅ Created test user:', newUser.first_name, newUser.last_name);
      users = [newUser];
    }
    
    const user = users[0];
    console.log('👤 Using user:', user.first_name, user.last_name);
    
    // 3. Create test trips for June 2025
    const testTrips = [
      {
        user_id: user.id,
        pickup_address: '123 Medical Center Dr, City, State 12345',
        destination_address: '456 Hospital Ave, City, State 12345',
        pickup_time: '2025-06-15T09:30:00.000Z',
        price: 45.50,
        wheelchair_type: 'none',
        is_round_trip: false,
        additional_passengers: 0,
        status: 'completed'
      },
      {
        user_id: user.id,
        pickup_address: '789 Therapy Center Blvd, City, State 12345',
        destination_address: '321 Rehab Facility St, City, State 12345',
        pickup_time: '2025-06-18T14:15:00.000Z',
        price: 62.75,
        wheelchair_type: 'provided',
        is_round_trip: true,
        additional_passengers: 1,
        status: 'completed'
      },
      {
        user_id: user.id,
        pickup_address: '555 Senior Center Way, City, State 12345',
        destination_address: '888 Specialist Clinic Dr, City, State 12345',
        pickup_time: '2025-06-22T11:00:00.000Z',
        price: 38.25,
        wheelchair_type: 'personal',
        is_round_trip: false,
        additional_passengers: 2,
        status: 'completed'
      }
    ];
    
    console.log('🚗 Creating test trips...');
    
    for (const trip of testTrips) {
      const { error: tripError } = await supabase
        .from('trips')
        .insert(trip);
      
      if (tripError) {
        console.error('❌ Failed to create trip:', tripError);
      } else {
        console.log('✅ Created trip:', trip.pickup_address.substring(0, 30) + '...', `$${trip.price}`);
      }
    }
    
    // 4. Verify the data
    const { data: verifyTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, user_id')
      .eq('user_id', user.id)
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z');
    
    const total = verifyTrips?.reduce((sum, trip) => sum + parseFloat(trip.price), 0) || 0;
    
    console.log('🎉 Success! Created', verifyTrips?.length || 0, 'trips');
    console.log('💰 Total amount:', `$${total.toFixed(2)}`);
    console.log('✅ Billing page should now show data for June 2025');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
addTestData();
