// Emergency script to add June 2025 test data for billing verification
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function addJune2025TestData() {
  console.log('🚨 Adding June 2025 test data for billing verification...\n');
  
  try {
    // 1. Get facility info
    const { data: facilities, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);

    if (facilityError || !facilities?.length) {
      console.error('❌ No facilities found:', facilityError?.message);
      return;
    }

    const facility = facilities[0];
    console.log('✅ Using facility:', facility.name, facility.id);

    // 2. Get or create facility users
    let { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');

    if (userError || !users?.length) {
      console.log('⚠️ No facility users found, creating test users...');
      
      // Create test facility users
      const testUsers = [
        {
          first_name: 'John',
          last_name: 'Smith', 
          email: `test.client1.${Date.now()}@facility.com`,
          facility_id: facility.id,
          role: 'facility',
          status: 'active',
          client_type: 'facility'
        },
        {
          first_name: 'Sarah',
          last_name: 'Johnson',
          email: `test.client2.${Date.now()}@facility.com`, 
          facility_id: facility.id,
          role: 'facility',
          status: 'active',
          client_type: 'facility'
        }
      ];

      const { data: newUsers, error: createError } = await supabase
        .from('profiles')
        .insert(testUsers)
        .select('id, first_name, last_name');

      if (createError) {
        console.error('❌ Error creating test users:', createError.message);
        return;
      }

      users = newUsers;
      console.log('✅ Created test users:', users.map(u => `${u.first_name} ${u.last_name}`));
    }

    console.log(`✅ Found ${users.length} facility users`);

    // 3. Check existing June 2025 trips
    const { data: existingTrips } = await supabase
      .from('trips')
      .select('id')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-06-01')
      .lt('pickup_time', '2025-07-01');

    if (existingTrips?.length > 0) {
      console.log(`✅ Already have ${existingTrips.length} trips in June 2025`);
      return;
    }

    // 4. Create test trips for June 2025
    const testTrips = [
      {
        user_id: users[0].id,
        facility_id: facility.id,
        pickup_address: '123 Main St, Columbus, OH 43215',
        destination_address: '456 Oak Ave, Columbus, OH 43215',
        pickup_time: '2025-06-05T10:00:00.000Z',
        status: 'completed',
        price: 75.50,
        wheelchair_type: 'no_wheelchair',
        is_round_trip: false
      },
      {
        user_id: users[1].id,
        facility_id: facility.id,
        pickup_address: '789 Elm St, Columbus, OH 43215',
        destination_address: '321 Pine Rd, Columbus, OH 43215', 
        pickup_time: '2025-06-10T14:30:00.000Z',
        status: 'completed',
        price: 92.25,
        wheelchair_type: 'provided',
        is_round_trip: false
      },
      {
        user_id: users[0].id,
        facility_id: facility.id,
        pickup_address: '555 Broadway, Columbus, OH 43215',
        destination_address: '777 High St, Columbus, OH 43215',
        pickup_time: '2025-06-15T09:15:00.000Z',
        status: 'completed', 
        price: 125.00,
        wheelchair_type: 'manual',
        is_round_trip: true
      },
      {
        user_id: users[1].id,
        facility_id: facility.id,
        pickup_address: '999 State St, Columbus, OH 43215',
        destination_address: '111 Market St, Columbus, OH 43215',
        pickup_time: '2025-06-20T16:45:00.000Z',
        status: 'completed',
        price: 68.75,
        wheelchair_type: 'no_wheelchair', 
        is_round_trip: false
      }
    ];

    const { data: newTrips, error: tripError } = await supabase
      .from('trips')
      .insert(testTrips)
      .select('id, pickup_time, price, status');

    if (tripError) {
      console.error('❌ Error creating test trips:', tripError.message);
      return;
    }

    const totalAmount = testTrips.reduce((sum, trip) => sum + trip.price, 0);

    console.log('✅ Created test trips for June 2025:');
    newTrips.forEach((trip, index) => {
      console.log(`   ${index + 1}. ${new Date(trip.pickup_time).toLocaleDateString()} - $${testTrips[index].price} (${trip.status})`);
    });

    console.log(`\n🎉 SUCCESS! Added ${newTrips.length} trips totaling $${totalAmount.toFixed(2)}`);
    console.log('🔄 Refresh the billing page to see the data!');

  } catch (err) {
    console.error('❌ Script error:', err.message);
  }
}

addJune2025TestData();
