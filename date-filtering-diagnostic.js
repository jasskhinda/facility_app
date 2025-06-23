// URGENT: DATE FILTERING DIAGNOSTIC
// Run this in browser console to check why June trips aren't appearing

console.log('🔍 DATE FILTERING DIAGNOSTIC - June 2025');

async function diagnoseDateFiltering() {
  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    console.log('✅ User ID:', session.user.id);

    // Check user profile
    const { data: profile } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    console.log('✅ User Profile:');
    console.log('- Role:', profile.role);
    console.log('- Facility ID:', profile.facility_id);

    // Get facility users
    const { data: facilityUsers } = await window.supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'facility');

    console.log('✅ Facility Users:', facilityUsers.length);
    const userIds = facilityUsers.map(u => u.id);

    // Check ALL trips for these users
    const { data: allTrips } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds)
      .order('pickup_time', { ascending: false });

    console.log('\n📊 ALL TRIPS FOR FACILITY:');
    console.log('Total trips:', allTrips.length);
    allTrips.forEach((trip, i) => {
      console.log(`${i+1}. ${trip.pickup_time} - ${trip.status} - $${trip.price || 'No price'}`);
    });

    // Test different date filtering approaches
    console.log('\n🔍 TESTING DATE FILTERS:');

    // Filter 1: Exact billing component logic
    const startDate = new Date('2025-06-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    
    console.log('Date range:', startISO, 'to', endISO);

    const { data: billingTrips } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds)
      .gte('pickup_time', startISO)
      .lte('pickup_time', endISO);

    console.log('Billing component query result:', billingTrips.length, 'trips');

    // Filter 2: Simple June filter
    const { data: juneTrips } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z');

    console.log('Simple June filter result:', juneTrips.length, 'trips');

    // Filter 3: Check specific dates
    const { data: june24Trip } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-24T00:00:00Z')
      .lt('pickup_time', '2025-06-25T00:00:00Z');

    console.log('June 24 trips:', june24Trip.length);

    const { data: june28Trip } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-28T00:00:00Z')
      .lt('pickup_time', '2025-06-29T00:00:00Z');

    console.log('June 28 trips:', june28Trip.length);

    // Check specific status filtering
    const { data: statusFilteredTrips } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds)
      .in('status', ['completed', 'pending', 'upcoming', 'confirmed'])
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z');

    console.log('Status filtered June trips:', statusFilteredTrips.length);

    // ANALYSIS
    console.log('\n🎯 ANALYSIS:');
    if (allTrips.length > 0 && billingTrips.length === 0) {
      console.log('❌ ISSUE: Date filtering is excluding your trips');
      console.log('Your trips exist but the date range query is not matching them');
      
      // Check trip dates format
      allTrips.forEach(trip => {
        const tripDate = new Date(trip.pickup_time);
        console.log(`Trip: ${trip.pickup_time} -> Parsed: ${tripDate.toLocaleString()}`);
      });
    }

    if (statusFilteredTrips.length !== juneTrips.length) {
      console.log('❌ ISSUE: Status filtering is excluding trips');
      console.log('Check if trip status is in the allowed list');
    }

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

diagnoseDateFiltering();
