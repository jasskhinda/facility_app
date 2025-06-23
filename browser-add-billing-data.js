// Browser console script to add test data for billing
// 1. Open browser developer tools (F12)
// 2. Go to the billing page
// 3. Paste this script in the console and hit Enter

console.log('🚀 Starting billing data fix...');

// This script will create test data directly via the browser
async function addBillingTestData() {
  try {
    // Get the Supabase client from the global scope (if available)
    // Or create a new one
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://btzfgasugkycbavcwvnx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
    );

    console.log('🔍 Checking existing data...');
    
    // Check for facilities
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    let facilityId;
    
    if (!facilities || facilities.length === 0) {
      console.log('🏥 Creating test facility...');
      const { data: newFacility, error } = await supabase
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
      
      if (error) {
        console.error('❌ Failed to create facility:', error);
        return;
      }
      
      facilityId = newFacility.id;
      console.log('✅ Created facility:', newFacility.name);
    } else {
      facilityId = facilities[0].id;
      console.log('✅ Using existing facility:', facilities[0].name);
    }
    
    // Check for facility users
    let { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facilityId)
      .eq('role', 'facility');
    
    if (!users || users.length === 0) {
      console.log('👤 Creating test facility users...');
      
      const testUsers = [
        {
          first_name: 'John',
          last_name: 'Smith',
          email: `john.smith.${Date.now()}@facility.com`,
          facility_id: facilityId,
          role: 'facility',
          status: 'active',
          client_type: 'facility'
        },
        {
          first_name: 'Sarah',
          last_name: 'Johnson',
          email: `sarah.johnson.${Date.now()}@facility.com`,
          facility_id: facilityId,
          role: 'facility',
          status: 'active',
          client_type: 'facility'
        }
      ];
      
      const { data: createdUsers, error: userError } = await supabase
        .from('profiles')
        .insert(testUsers)
        .select();
      
      if (userError) {
        console.error('❌ Failed to create users:', userError);
        return;
      }
      
      users = createdUsers;
      console.log('✅ Created', users.length, 'facility users');
    } else {
      console.log('✅ Using existing', users.length, 'facility users');
    }
    
    // Create test trips for June 2025
    console.log('🚗 Creating June 2025 test trips...');
    
    const testTrips = [
      {
        user_id: users[0].id,
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
        user_id: users[0].id,
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
        user_id: users.length > 1 ? users[1].id : users[0].id,
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
    
    // Check if trips already exist
    const { data: existingTrips } = await supabase
      .from('trips')
      .select('id')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z');
    
    if (existingTrips && existingTrips.length > 0) {
      console.log('✅ Found', existingTrips.length, 'existing trips for June 2025');
    } else {
      const { data: createdTrips, error: tripError } = await supabase
        .from('trips')
        .insert(testTrips)
        .select();
      
      if (tripError) {
        console.error('❌ Failed to create trips:', tripError);
        return;
      }
      
      console.log('✅ Created', createdTrips.length, 'test trips');
    }
    
    // Verify final data
    const { data: finalTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z');
    
    const totalAmount = finalTrips?.reduce((sum, trip) => sum + parseFloat(trip.price), 0) || 0;
    
    console.log('🎉 SUCCESS!');
    console.log('📊 June 2025 Data:');
    console.log('   - Trips:', finalTrips?.length || 0);
    console.log('   - Total Amount: $' + totalAmount.toFixed(2));
    console.log('   - Facility ID:', facilityId);
    console.log('   - Users:', users.length);
    
    console.log('🔄 Refreshing page to see updated data...');
    
    // Refresh the page to see the updated data
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Execute the function
addBillingTestData();

console.log('📋 Instructions:');
console.log('1. Wait for the script to complete');
console.log('2. Page will refresh automatically');
console.log('3. Select "June 2025" from the dropdown');
console.log('4. You should see trip data and billing amounts');
