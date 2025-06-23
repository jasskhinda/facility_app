const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function addImmediateTestData() {
  console.log('🚨 EMERGENCY FIX: Adding June 2025 data immediately...\n');
  
  try {
    // 1. Get facility info
    const { data: facilities, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);

    if (facilityError) {
      console.error('❌ Facility error:', facilityError.message);
      return;
    }

    if (!facilities?.length) {
      console.log('❌ No facilities found');
      return;
    }

    const facility = facilities[0];
    console.log('✅ Using facility:', facility.name, facility.id);

    // 2. Get facility users
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');

    if (userError) {
      console.error('❌ Users error:', userError.message);
      return;
    }

    if (!users?.length) {
      console.log('❌ No facility users found');
      return;
    }

    console.log(`✅ Found ${users.length} facility users`);

    // 3. Check existing June 2025 trips
    const { data: existingJune, error: juneError } = await supabase
      .from('trips')
      .select('id')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z');

    console.log(`📊 Current June 2025 trips: ${existingJune?.length || 0}`);

    // 4. Add June 2025 trips if needed
    if (!existingJune || existingJune.length < 5) {
      console.log('🔧 Adding June 2025 test trips...');
      
      const testTrips = [];
      for (let i = 1; i <= 8; i++) {
        const user = users[i % users.length];
        testTrips.push({
          user_id: user.id,
          pickup_address: `June Medical Center ${i}, Columbus, OH`,
          destination_address: `June Hospital ${i}, Columbus, OH`,
          pickup_time: `2025-06-${String(i + 10).padStart(2, '0')}T${String(9 + (i % 8)).padStart(2, '0')}:30:00Z`,
          status: i % 3 === 0 ? 'completed' : 'confirmed',
          price: 45.00 + (i * 2.50),
          wheelchair_type: ['no_wheelchair', 'provided', 'manual', 'power'][i % 4],
          is_round_trip: i % 3 === 0,
          distance: 8.0 + (i * 0.5),
          additional_passengers: i % 3,
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

    // 5. Add May 2025 trips for dropdown testing
    const { data: existingMay, error: mayError } = await supabase
      .from('trips')
      .select('id')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-05-01T00:00:00Z')
      .lt('pickup_time', '2025-06-01T00:00:00Z');

    if (!existingMay || existingMay.length < 3) {
      console.log('🔧 Adding May 2025 test trips...');
      
      const mayTrips = [];
      for (let i = 1; i <= 5; i++) {
        const user = users[i % users.length];
        mayTrips.push({
          user_id: user.id,
          pickup_address: `May Medical Center ${i}, Columbus, OH`,
          destination_address: `May Hospital ${i}, Columbus, OH`,
          pickup_time: `2025-05-${String(i + 15).padStart(2, '0')}T${String(10 + (i % 6)).padStart(2, '0')}:00:00Z`,
          status: 'completed',
          price: 38.00 + (i * 3.00),
          wheelchair_type: 'no_wheelchair',
          is_round_trip: false,
          distance: 6.0 + (i * 0.3),
          additional_passengers: 0,
          created_at: new Date().toISOString()
        });
      }

      const { error: mayInsertError } = await supabase
        .from('trips')
        .insert(mayTrips);

      if (mayInsertError) {
        console.error('❌ May insert error:', mayInsertError.message);
      } else {
        console.log(`✅ Added ${mayTrips.length} May 2025 trips`);
      }
    }

    // 6. Verify final counts
    const { data: finalJune, error: finalJuneError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z')
      .order('pickup_time', { ascending: false });

    const { data: finalMay, error: finalMayError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status')
      .in('user_id', users.map(u => u.id))
      .gte('pickup_time', '2025-05-01T00:00:00Z')
      .lt('pickup_time', '2025-06-01T00:00:00Z')
      .order('pickup_time', { ascending: false });

    console.log('\n📊 FINAL VERIFICATION:');
    console.log('=======================');
    
    if (finalJune?.length > 0) {
      const juneTotal = finalJune.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
      console.log(`✅ June 2025: ${finalJune.length} trips, $${juneTotal.toFixed(2)} total`);
      console.log('   Sample trip:', {
        date: finalJune[0].pickup_time?.split('T')[0],
        price: '$' + finalJune[0].price,
        status: finalJune[0].status
      });
    } else {
      console.log('❌ June 2025: No trips found');
    }

    if (finalMay?.length > 0) {
      const mayTotal = finalMay.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
      console.log(`✅ May 2025: ${finalMay.length} trips, $${mayTotal.toFixed(2)} total`);
    } else {
      console.log('❌ May 2025: No trips found');
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Refresh the billing page in browser');
    console.log('2. Check that June 2025 shows trips and amount');
    console.log('3. Test changing dropdown to May 2025');
    console.log('4. Verify month text updates immediately');
    console.log('\n🚀 Data is now ready for testing!');

  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
  }
}

addImmediateTestData();
