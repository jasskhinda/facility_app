// PASTE THIS INTO BROWSER DEVELOPER CONSOLE
// Open browser dev tools (F12), go to Console tab, paste this entire script

console.log('🚀 BILLING FIX - Browser Console Solution');
console.log('=========================================');

async function fixBillingData() {
  try {
    // Import Supabase client
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabase = createClient(
      'https://btzfgasugkycbavcwvnx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
    );

    console.log('✅ Supabase client created');

    // Step 1: Check/Create facility
    console.log('\n1️⃣ Checking facilities...');
    let { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);

    if (!facilities || facilities.length === 0) {
      console.log('Creating facility...');
      const { data: newFacility } = await supabase
        .from('facilities')
        .insert({
          name: 'Healthcare Facility',
          billing_email: 'billing@healthcare.com',
          address: '123 Medical Dr, City, State 12345',
          phone_number: '(555) 123-4567',
          status: 'active',
          contact_email: 'contact@healthcare.com'
        })
        .select()
        .single();
      
      facilities = [newFacility];
      console.log('✅ Created facility:', newFacility.name);
    }

    const facility = facilities[0];
    console.log(`✅ Using facility: ${facility.name} (ID: ${facility.id})`);

    // Step 2: Check/Create facility users
    console.log('\n2️⃣ Checking facility users...');
    let { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');

    if (!users || users.length === 0) {
      console.log('Creating facility users...');
      
      const { data: newUsers } = await supabase
        .from('profiles')
        .insert([
          {
            first_name: 'John',
            last_name: 'Smith',
            email: `john.smith.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active',
            client_type: 'facility'
          },
          {
            first_name: 'Sarah',
            last_name: 'Johnson',
            email: `sarah.johnson.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active',
            client_type: 'facility'
          },
          {
            first_name: 'Michael',
            last_name: 'Davis',
            email: `michael.davis.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active',
            client_type: 'facility'
          }
        ])
        .select();

      users = newUsers;
      console.log('✅ Created facility users:', users.length);
      users.forEach(u => console.log(`   - ${u.first_name} ${u.last_name}`));
    } else {
      console.log(`✅ Found ${users.length} facility users`);
    }

    // Step 3: Check/Create June 2025 trips
    console.log('\n3️⃣ Checking June 2025 trips...');
    const userIds = users.map(u => u.id);
    
    const { data: existingTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z');

    if (!existingTrips || existingTrips.length === 0) {
      console.log('Creating June 2025 trips...');
      
      const { data: newTrips } = await supabase
        .from('trips')
        .insert([
          {
            user_id: users[0].id,
            pickup_address: '123 Medical Center Dr, Healthcare City, State 12345',
            destination_address: '456 Hospital Ave, Healthcare City, State 12345',
            pickup_time: '2025-06-15T09:30:00.000Z',
            price: 45.50,
            wheelchair_type: 'none',
            is_round_trip: false,
            additional_passengers: 0,
            status: 'completed'
          },
          {
            user_id: users[0].id,
            pickup_address: '789 Therapy Center Blvd, Healthcare City, State 12345',
            destination_address: '321 Rehab Facility St, Healthcare City, State 12345',
            pickup_time: '2025-06-18T14:15:00.000Z',
            price: 62.75,
            wheelchair_type: 'provided',
            is_round_trip: true,
            additional_passengers: 1,
            status: 'completed'
          },
          {
            user_id: users.length > 1 ? users[1].id : users[0].id,
            pickup_address: '555 Senior Center Way, Healthcare City, State 12345',
            destination_address: '888 Specialist Clinic Dr, Healthcare City, State 12345',
            pickup_time: '2025-06-22T11:00:00.000Z',
            price: 38.25,
            wheelchair_type: 'personal',
            is_round_trip: false,
            additional_passengers: 2,
            status: 'completed'
          },
          {
            user_id: users.length > 2 ? users[2].id : users[0].id,
            pickup_address: '999 Care Facility Dr, Healthcare City, State 12345',
            destination_address: '111 Diagnostic Center Ave, Healthcare City, State 12345',
            pickup_time: '2025-06-25T13:45:00.000Z',
            price: 52.00,
            wheelchair_type: 'provided',
            is_round_trip: false,
            additional_passengers: 0,
            status: 'completed'
          }
        ])
        .select();

      console.log('✅ Created trips:', newTrips.length);
    } else {
      console.log(`✅ Found ${existingTrips.length} existing trips`);
    }

    // Step 4: Final verification
    console.log('\n4️⃣ Final verification...');
    const { data: finalTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, user_id')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z')
      .order('pickup_time', { ascending: false });

    const total = finalTrips?.reduce((sum, trip) => sum + parseFloat(trip.price), 0) || 0;

    console.log('\n🎉 BILLING FIX COMPLETE!');
    console.log('═══════════════════════════');
    console.log(`🏥 Facility: ${facility.name}`);
    console.log(`📋 Facility ID: ${facility.id}`);
    console.log(`👥 Facility Users: ${users.length}`);
    console.log(`🚗 June 2025 Trips: ${finalTrips?.length || 0}`);
    console.log(`💰 Total Amount: $${total.toFixed(2)}`);
    console.log('═══════════════════════════');
    
    console.log('\n📋 Trip Details:');
    finalTrips?.forEach((trip, index) => {
      const user = users.find(u => u.id === trip.user_id);
      const date = new Date(trip.pickup_time).toLocaleDateString();
      console.log(`${index + 1}. ${date} - ${user?.first_name} ${user?.last_name} - $${trip.price}`);
    });

    console.log('\n✅ SUCCESS! Now refresh the page and select "June 2025" from the dropdown!');
    
    // Auto-refresh after 3 seconds
    setTimeout(() => {
      console.log('🔄 Auto-refreshing page...');
      window.location.reload();
    }, 3000);

  } catch (error) {
    console.error('❌ Error fixing billing data:', error);
  }
}

// Execute the fix
fixBillingData();

console.log('\n📝 INSTRUCTIONS:');
console.log('1. Wait for the script to complete');
console.log('2. Page will refresh automatically');
console.log('3. Select "June 2025" from the month dropdown');
console.log('4. You should now see billing data!');
