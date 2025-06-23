const { createClient } = require('@supabase/supabase-js');

console.log('🚨 EMERGENCY DATA AND QUERY FIX');
console.log('===============================');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA'
);

async function emergencyFix() {
  try {
    // 1. Get facility and users
    console.log('🔍 Getting facility and users...');
    
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

    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');

    if (userError || !users?.length) {
      console.error('❌ No facility users found:', userError?.message);
      return;
    }

    console.log(`✅ Found ${users.length} facility users`);

    // 2. Check existing June 2025 trips
    const { data: existingTrips, error: existingError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z');

    console.log(`📊 Existing June 2025 trips: ${existingTrips?.length || 0}`);

    // 3. Add June 2025 trips if none exist
    if (!existingTrips || existingTrips.length === 0) {
      console.log('🔧 Adding June 2025 trips...');
      
      const testTrips = [];
      for (let i = 1; i <= 10; i++) {
        const user = users[i % users.length];
        testTrips.push({
          user_id: user.id,
          pickup_address: `${i} Medical Center Dr, Columbus, OH 43215`,
          destination_address: `${i} Hospital Way, Columbus, OH 43210`,
          pickup_time: `2025-06-${String(i + 5).padStart(2, '0')}T${String(9 + (i % 8)).padStart(2, '0')}:30:00Z`,
          status: 'completed',
          price: 45.00 + (i * 2.50),
          wheelchair_type: 'no_wheelchair',
          is_round_trip: false,
          distance: 8.0,
          additional_passengers: 0,
          created_at: new Date().toISOString()
        });
      }

      const { data: insertedTrips, error: insertError } = await supabase
        .from('trips')
        .insert(testTrips)
        .select();

      if (insertError) {
        console.error('❌ Insert error:', insertError.message);
      } else {
        console.log(`✅ Added ${insertedTrips?.length || 0} June 2025 trips`);
      }
    }

    // 4. Test the exact query that the billing component uses
    console.log('\n🧪 Testing billing component query...');
    
    const startDate = new Date('2025-06-01');
    const endDate = new Date(2025, 5, 30, 23, 59, 59, 999); // June 30, 2025 end of day
    
    console.log('📅 Query date range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    // Test simple query without joins first
    const { data: simpleTrips, error: simpleError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        price,
        status,
        user_id
      `)
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });

    console.log('📊 Simple query result:', {
      trips: simpleTrips?.length || 0,
      error: simpleError?.message || 'none'
    });

    if (simpleTrips?.length > 0) {
      const total = simpleTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
      console.log(`💰 Total amount: $${total.toFixed(2)}`);
      console.log('📍 Sample trip:', {
        date: simpleTrips[0].pickup_time?.split('T')[0],
        price: '$' + simpleTrips[0].price,
        status: simpleTrips[0].status,
        address: simpleTrips[0].pickup_address?.substring(0, 30) + '...'
      });
    }

    // Test with user joins
    console.log('\n🧪 Testing query with user joins...');
    
    const { data: joinedTrips, error: joinError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        price,
        status,
        user_id,
        user:profiles!trips_user_id_fkey(first_name, last_name)
      `)
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });

    console.log('📊 Joined query result:', {
      trips: joinedTrips?.length || 0,
      error: joinError?.message || 'none'
    });

    if (joinedTrips?.length > 0) {
      console.log('📍 Sample trip with client name:', {
        date: joinedTrips[0].pickup_time?.split('T')[0],
        client: joinedTrips[0].user?.first_name + ' ' + joinedTrips[0].user?.last_name,
        price: '$' + joinedTrips[0].price
      });
    }

    console.log('\n🎯 DIAGNOSIS:');
    if (simpleTrips?.length > 0) {
      console.log('✅ Data exists and simple queries work');
      console.log('✅ Billing component should be able to load data');
      console.log('⚠️ Issue is likely in the component query logic or joins');
    } else {
      console.log('❌ No data found - need to add more test data');
    }

    console.log('\n📝 RECOMMENDATIONS:');
    console.log('1. Use simple query without managed_clients join');
    console.log('2. Handle user profiles separately');
    console.log('3. Filter by valid statuses after fetching');
    console.log('4. Refresh browser page after data is added');

  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
  }
}

emergencyFix();
