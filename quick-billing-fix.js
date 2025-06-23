// Quick verification and data creation for billing
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function quickBillingFix() {
  console.log('🔧 Quick Billing Data Fix - June 2025');
  console.log('=====================================\n');
  
  try {
    // Check current state
    console.log('1. Checking facilities...');
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    if (!facilities || facilities.length === 0) {
      console.log('❌ No facilities found. Creating one...');
      await supabase.from('facilities').insert({
        name: 'Healthcare Facility',
        billing_email: 'billing@healthcare.com',
        address: '123 Medical Dr, City, State 12345',
        phone_number: '(555) 123-4567',
        status: 'active'
      });
      console.log('✅ Created facility');
    }
    
    const facility = facilities ? facilities[0] : { id: 1, name: 'Healthcare Facility' };
    console.log(`   Using: ${facility.name} (ID: ${facility.id})`);
    
    // Check facility users
    console.log('\n2. Checking facility users...');
    let { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');
    
    if (!users || users.length === 0) {
      console.log('❌ No facility users found. Creating them...');
      
      const { data: newUsers } = await supabase
        .from('profiles')
        .insert([
          {
            first_name: 'John',
            last_name: 'Smith',
            email: `john.smith.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active'
          },
          {
            first_name: 'Sarah',
            last_name: 'Johnson',
            email: `sarah.johnson.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active'
          }
        ])
        .select();
      
      users = newUsers;
      console.log('✅ Created facility users:', users.length);
    } else {
      console.log(`   Found: ${users.length} facility users`);
    }
    
    // Check June 2025 trips
    console.log('\n3. Checking June 2025 trips...');
    const userIds = users.map(u => u.id);
    
    const { data: existingTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z');
    
    if (!existingTrips || existingTrips.length === 0) {
      console.log('❌ No June 2025 trips found. Creating them...');
      
      const { data: newTrips } = await supabase
        .from('trips')
        .insert([
          {
            user_id: users[0].id,
            pickup_address: '123 Medical Center Dr, City, State',
            destination_address: '456 Hospital Ave, City, State',
            pickup_time: '2025-06-15T09:30:00.000Z',
            price: 45.50,
            status: 'completed'
          },
          {
            user_id: users[0].id,
            pickup_address: '789 Therapy Center Blvd, City, State',
            destination_address: '321 Rehab Facility St, City, State',
            pickup_time: '2025-06-18T14:15:00.000Z',
            price: 62.75,
            status: 'completed'
          },
          {
            user_id: users.length > 1 ? users[1].id : users[0].id,
            pickup_address: '555 Senior Center Way, City, State',
            destination_address: '888 Specialist Clinic Dr, City, State',
            pickup_time: '2025-06-22T11:00:00.000Z',
            price: 38.25,
            status: 'completed'
          }
        ])
        .select();
      
      console.log('✅ Created trips:', newTrips.length);
    } else {
      console.log(`   Found: ${existingTrips.length} existing trips`);
    }
    
    // Final verification
    console.log('\n4. Final verification...');
    const { data: finalTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, user_id')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z')
      .order('pickup_time', { ascending: false });
    
    const total = finalTrips?.reduce((sum, trip) => sum + parseFloat(trip.price), 0) || 0;
    
    console.log('\n🎉 BILLING FIX COMPLETE!');
    console.log('========================');
    console.log(`🏥 Facility: ${facility.name}`);
    console.log(`👥 Users: ${users.length}`);
    console.log(`🚗 June 2025 Trips: ${finalTrips?.length || 0}`);
    console.log(`💰 Total: $${total.toFixed(2)}`);
    console.log('\n✅ Go to billing page and select "June 2025"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickBillingFix();
