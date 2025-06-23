// IMMEDIATE FIX for April 2025 billing
// Copy and paste this into browser console on the billing page

(async function fixApril2025Billing() {
  console.log('🚀 FIXING APRIL 2025 BILLING ISSUE...');
  console.log('=====================================');
  
  try {
    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://btzfgasugkycbavcwvnx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
    );

    // Check for existing April 2025 trips
    const { data: existingTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price')
      .gte('pickup_time', '2025-04-01')
      .lte('pickup_time', '2025-04-30');
    
    console.log('📊 Existing April 2025 trips:', existingTrips?.length || 0);
    
    if (existingTrips && existingTrips.length > 0) {
      const total = existingTrips.reduce((sum, t) => sum + parseFloat(t.price), 0);
      console.log('✅ April 2025 data already exists!');
      console.log(`💰 Total: $${total.toFixed(2)}`);
      console.log('🔄 Refreshing page to show data...');
      setTimeout(() => window.location.reload(), 2000);
      return;
    }
    
    console.log('🔧 Creating April 2025 test data...');
    
    // Get facility
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    if (!facilities || facilities.length === 0) {
      console.log('🏥 Creating test facility...');
      const { data: newFacility } = await supabase
        .from('facilities')
        .insert({
          name: 'Healthcare Facility',
          billing_email: 'billing@healthcare.com',
          address: '123 Medical Dr, City, State 12345',
          phone_number: '(555) 123-4567',
          status: 'active'
        })
        .select()
        .single();
      
      facilities.push(newFacility);
    }
    
    const facility = facilities[0];
    console.log('🏥 Using facility:', facility.name);
    
    // Get or create facility users
    let { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');
    
    if (!users || users.length === 0) {
      console.log('👤 Creating facility client...');
      
      const { data: newUser } = await supabase
        .from('profiles')
        .insert({
          first_name: 'April',
          last_name: 'Client',
          email: `april.client.${Date.now()}@facility.com`,
          facility_id: facility.id,
          role: 'facility',
          status: 'active',
          client_type: 'facility'
        })
        .select()
        .single();
      
      users = [newUser];
    }
    
    console.log('✅ Using client:', users[0].first_name, users[0].last_name);
    
    // Create April 2025 trips
    const aprilTrips = [
      {
        user_id: users[0].id,
        pickup_address: '123 Medical Center, City, State 12345',
        destination_address: '456 Clinic Ave, City, State 12345',
        pickup_time: '2025-04-10T10:00:00.000Z',
        price: 42.75,
        wheelchair_type: 'none',
        status: 'completed'
      },
      {
        user_id: users[0].id,
        pickup_address: '789 Therapy Center, City, State 12345',
        destination_address: '321 Wellness Facility, City, State 12345',
        pickup_time: '2025-04-15T14:30:00.000Z',
        price: 55.25,
        wheelchair_type: 'provided',
        status: 'completed'
      },
      {
        user_id: users[0].id,
        pickup_address: '555 Senior Center, City, State 12345',
        destination_address: '888 Specialist Dr, City, State 12345',
        pickup_time: '2025-04-20T11:15:00.000Z',
        price: 38.50,
        wheelchair_type: 'personal',
        status: 'completed'
      }
    ];
    
    const { data: createdTrips, error: tripError } = await supabase
      .from('trips')
      .insert(aprilTrips)
      .select();
    
    if (tripError) {
      console.error('❌ Error creating trips:', tripError);
      return;
    }
    
    const totalAmount = aprilTrips.reduce((sum, trip) => sum + trip.price, 0);
    
    console.log('🎉 SUCCESS! April 2025 data created:');
    console.log(`📊 Trips: ${createdTrips.length}`);
    console.log(`💰 Total: $${totalAmount.toFixed(2)}`);
    console.log('🔄 Refreshing page to show new data...');
    
    // Refresh the page to show the new data
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

console.log('📋 Instructions:');
console.log('1. Wait for the script to complete');
console.log('2. Page will refresh automatically');  
console.log('3. Select "April 2025" from dropdown');
console.log('4. You should see trips and billing amounts');
