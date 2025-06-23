// BILLING DIAGNOSTIC SCRIPT
// Copy and paste this in browser console on the billing page

console.log('🔍 BILLING DIAGNOSTIC STARTING...');

async function diagnoseBillingIssue() {
  try {
    // Check if we have supabase available
    if (!window.supabase) {
      console.error('❌ Supabase client not available');
      return;
    }

    console.log('✅ Supabase client found');

    // 1. Check current session
    console.log('\n📋 STEP 1: Checking current session...');
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }

    if (!session) {
      console.error('❌ No active session - user not logged in');
      console.log('👉 ACTION: Please log in first');
      return;
    }

    console.log('✅ Active session found');
    console.log('   User ID:', session.user.id);
    console.log('   Email:', session.user.email);
    console.log('   Created:', new Date(session.user.created_at).toLocaleString());

    // 2. Check user profile
    console.log('\n📋 STEP 2: Checking user profile in database...');
    const { data: profile, error: profileError } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      if (profileError.code === 'PGRST116') {
        console.log('❌ ISSUE FOUND: No profile exists for this user');
        console.log('👉 ACTION: Profile needs to be created in database');
      }
      return;
    }

    console.log('✅ Profile found');
    console.log('   Name:', profile.first_name, profile.last_name);
    console.log('   Role:', profile.role);
    console.log('   Facility ID:', profile.facility_id);

    // 3. Check role and facility requirements
    console.log('\n📋 STEP 3: Checking facility requirements...');
    
    if (profile.role !== 'facility') {
      console.error('❌ ISSUE FOUND: User role is not "facility"');
      console.log('   Current role:', profile.role);
      console.log('👉 ACTION: Update user role to "facility" in database');
      console.log('   SQL: UPDATE profiles SET role = \'facility\' WHERE id = \'' + session.user.id + '\';');
      return;
    }

    if (!profile.facility_id) {
      console.error('❌ ISSUE FOUND: User has no facility_id');
      console.log('👉 ACTION: Assign facility_id to user in database');
      console.log('   SQL: UPDATE profiles SET facility_id = \'e1b94bde-d092-4ce6-b78c-9cff1d0118a3\' WHERE id = \'' + session.user.id + '\';');
      return;
    }

    console.log('✅ User has correct role and facility_id');

    // 4. Check if facility exists
    console.log('\n📋 STEP 4: Checking if facility exists...');
    const { data: facility, error: facilityError } = await window.supabase
      .from('facilities')
      .select('*')
      .eq('id', profile.facility_id)
      .single();

    if (facilityError) {
      console.error('❌ ISSUE FOUND: Facility not found');
      console.log('   Facility ID:', profile.facility_id);
      console.log('👉 ACTION: Create facility in database');
      return;
    }

    console.log('✅ Facility found');
    console.log('   Name:', facility.name);
    console.log('   Billing Email:', facility.billing_email);

    // 5. Check for trips
    console.log('\n📋 STEP 5: Checking for trips...');
    
    // Get all facility users
    const { data: facilityUsers, error: usersError } = await window.supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'facility');

    if (usersError) {
      console.error('❌ Error fetching facility users:', usersError);
      return;
    }

    console.log('✅ Found', facilityUsers.length, 'facility users');
    const userIds = facilityUsers.map(u => u.id);

    // Check trips for June 2025
    const { data: juneTrips, error: tripsError } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z');

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }

    console.log('✅ Found', juneTrips.length, 'trips in June 2025');
    if (juneTrips.length > 0) {
      console.log('   Trip details:');
      juneTrips.forEach((trip, index) => {
        console.log(`   ${index + 1}. ${trip.pickup_time} - $${trip.price} - ${trip.status}`);
      });
    }

    // 6. Check all trips for this facility
    const { data: allTrips, error: allTripsError } = await window.supabase
      .from('trips')
      .select('*')
      .in('user_id', userIds);

    if (allTripsError) {
      console.error('❌ Error fetching all trips:', allTripsError);
      return;
    }

    console.log('✅ Found', allTrips.length, 'total trips for facility');

    // 7. Final diagnosis
    console.log('\n🎯 FINAL DIAGNOSIS:');
    if (juneTrips.length === 0) {
      if (allTrips.length === 0) {
        console.log('❌ ISSUE: No trips exist for this facility');
        console.log('👉 ACTION: Create test trips for June 2025');
        console.log('   Use the SQL in BILLING_ISSUE_IMMEDIATE_FIX.md');
      } else {
        console.log('❌ ISSUE: Trips exist but not in June 2025');
        console.log('   Total trips:', allTrips.length);
        console.log('👉 ACTION: Either create trips for June 2025 or select a different month');
      }
    } else {
      console.log('✅ SUCCESS: Everything looks correct!');
      console.log('   Facility users:', facilityUsers.length);
      console.log('   June 2025 trips:', juneTrips.length);
      console.log('   Total trip value: $' + juneTrips.reduce((sum, trip) => sum + (trip.price || 0), 0).toFixed(2));
      console.log('👉 ACTION: Billing page should work. Try refreshing the page.');
    }

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

// Run the diagnostic
diagnoseBillingIssue();
