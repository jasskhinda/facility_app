// COMPLETE FIX for billing month sync and data
// Copy and paste this entire script into browser console

(async function completeBillingFix() {
  console.log('🚀 COMPLETE BILLING FIX STARTING...');
  console.log('=====================================');
  
  try {
    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://btzfgasugkycbavcwvnx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
    );

    // 1. Check what month is currently selected
    const dropdown = document.querySelector('select');
    const currentlySelected = dropdown ? dropdown.value : null;
    console.log('📅 Currently selected month:', currentlySelected);
    
    // 2. Create data for both May and June 2025 to ensure we have data
    const monthsToCreate = [
      { month: '2025-05', name: 'May 2025' },
      { month: '2025-06', name: 'June 2025' }
    ];
    
    // 3. Get or create facility
    let { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    if (!facilities || facilities.length === 0) {
      console.log('🏥 Creating facility...');
      const { data: newFacility } = await supabase
        .from('facilities')
        .insert({
          name: 'Compassionate Care Transportation Facility',
          billing_email: 'billing@compassionatecaretransportation.com',
          address: '5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017',
          phone_number: '614-967-9887',
          status: 'active',
          contact_email: 'info@compassionatecaretransportation.com'
        })
        .select()
        .single();
      
      facilities = [newFacility];
    }
    
    const facility = facilities[0];
    console.log('🏥 Using facility:', facility.name);
    
    // 4. Get or create facility users
    let { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');
    
    if (!users || users.length === 0) {
      console.log('👤 Creating facility clients...');
      
      const { data: newUsers } = await supabase
        .from('profiles')
        .insert([
          {
            first_name: 'Mary',
            last_name: 'Johnson',
            email: `mary.johnson.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active',
            client_type: 'facility',
            phone_number: '(555) 200-0001'
          },
          {
            first_name: 'James',
            last_name: 'Wilson',
            email: `james.wilson.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active',
            client_type: 'facility',
            phone_number: '(555) 200-0002'
          }
        ])
        .select();
      
      users = newUsers;
    }
    
    console.log('✅ Using', users.length, 'facility clients');
    
    // 5. Create trips for each month
    for (const monthInfo of monthsToCreate) {
      const { month, name } = monthInfo;
      
      // Check if data already exists
      const { data: existingTrips } = await supabase
        .from('trips')
        .select('id')
        .in('user_id', users.map(u => u.id))
        .gte('pickup_time', `${month}-01`)
        .lte('pickup_time', `${month}-31`);
      
      if (existingTrips && existingTrips.length > 0) {
        console.log(`✅ ${name} already has ${existingTrips.length} trips`);
        continue;
      }
      
      console.log(`🚗 Creating trips for ${name}...`);
      
      const trips = [
        {
          user_id: users[0].id,
          pickup_address: `${name} Medical Center, 123 Healthcare Dr, City, State`,
          destination_address: `${name} Specialist Clinic, 456 Medical Ave, City, State`,
          pickup_time: `${month}-10T10:00:00.000Z`,
          price: 45.75,
          wheelchair_type: 'none',
          status: 'completed',
          is_round_trip: false,
          additional_passengers: 0
        },
        {
          user_id: users[0].id,
          pickup_address: `${name} Therapy Center, 789 Wellness Blvd, City, State`,
          destination_address: `${name} Rehabilitation Facility, 321 Recovery St, City, State`,
          pickup_time: `${month}-15T14:30:00.000Z`,
          price: 62.50,
          wheelchair_type: 'provided',
          status: 'completed',
          is_round_trip: true,
          additional_passengers: 1
        },
        {
          user_id: users.length > 1 ? users[1].id : users[0].id,
          pickup_address: `${name} Senior Center, 555 Elder Care Way, City, State`,
          destination_address: `${name} Diagnostic Center, 888 Testing Dr, City, State`,
          pickup_time: `${month}-20T11:15:00.000Z`,
          price: 38.25,
          wheelchair_type: 'personal',
          status: 'completed',
          is_round_trip: false,
          additional_passengers: 0
        }
      ];
      
      const { data: createdTrips, error } = await supabase
        .from('trips')
        .insert(trips)
        .select();
      
      if (error) {
        console.error(`❌ Error creating ${name} trips:`, error);
      } else {
        const total = trips.reduce((sum, trip) => sum + trip.price, 0);
        console.log(`✅ Created ${createdTrips.length} trips for ${name} - Total: $${total.toFixed(2)}`);
      }
    }
    
    // 6. Verify data exists
    console.log('\n📊 VERIFICATION:');
    
    for (const monthInfo of monthsToCreate) {
      const { month, name } = monthInfo;
      
      const { data: monthTrips } = await supabase
        .from('trips')
        .select('id, pickup_time, price')
        .in('user_id', users.map(u => u.id))
        .gte('pickup_time', `${month}-01`)
        .lte('pickup_time', `${month}-31`);
      
      const total = monthTrips?.reduce((sum, trip) => sum + parseFloat(trip.price), 0) || 0;
      console.log(`📅 ${name}: ${monthTrips?.length || 0} trips, $${total.toFixed(2)}`);
    }
    
    console.log('\n🎉 SUCCESS! Billing data is ready');
    console.log('===============================');
    console.log('🔄 Refreshing page in 3 seconds...');
    console.log('📝 After refresh:');
    console.log('   1. Try selecting May 2025 - should show trips');
    console.log('   2. Try selecting June 2025 - should show trips');
    console.log('   3. Month display text should match dropdown');
    
    // Refresh the page
    setTimeout(() => {
      window.location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
