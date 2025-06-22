// PRODUCTION DEBUGGING SCRIPT
// Run this in the browser console on the billing page to debug the issue
// Copy and paste this entire script into the browser console

console.log('🔧 Starting Production Billing Debug Script...');

// Get the current supabase client from the window
const supabase = window.supabase || window._supabaseClient;
if (!supabase) {
  console.error('❌ Supabase client not found on window object');
  // Try to get it from the component context
  console.log('Trying to access supabase from other sources...');
}

async function debugBillingIssue() {
  try {
    console.log('🔍 Debug Step 1: Get current user profile...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Failed to get current user:', userError);
      return;
    }
    
    console.log('👤 Current user:', user.id);
    
    // Get user profile to find facility_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      console.error('❌ Failed to get user profile:', profileError);
      return;
    }
    
    console.log('📋 User profile:', profile);
    const facilityId = profile.facility_id;
    
    if (!facilityId) {
      console.error('❌ User has no facility_id assigned');
      return;
    }
    
    console.log('🏢 Facility ID:', facilityId);
    
    console.log('🔍 Debug Step 2: Find all users in this facility...');
    
    // Find all users in this facility
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('facility_id', facilityId);
      
    if (facilityUsersError) {
      console.error('❌ Failed to get facility users:', facilityUsersError);
      return;
    }
    
    console.log('👥 Facility users:', facilityUsers);
    const facilityUserIds = facilityUsers?.map(user => user.id) || [];
    
    console.log('🔍 Debug Step 3: Find ALL trips for facility users...');
    
    // Find all trips for these users
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });
      
    if (allTripsError) {
      console.error('❌ Failed to get all trips:', allTripsError);
      return;
    }
    
    console.log('🚗 All trips for facility users:', allTrips);
    
    // Group trips by month
    const tripsByMonth = {};
    allTrips.forEach(trip => {
      const date = new Date(trip.pickup_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!tripsByMonth[monthKey]) {
        tripsByMonth[monthKey] = [];
      }
      tripsByMonth[monthKey].push(trip);
    });
    
    console.log('📊 Trips grouped by month:', tripsByMonth);
    
    console.log('🔍 Debug Step 4: Test specific date filtering for June 2025...');
    
    // Test June 2025 filtering
    const selectedMonth = '2025-06';
    const startDate = new Date(selectedMonth + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('📅 Date range for June 2025:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // Test current filtering logic
    const { data: juneTrips, error: juneTripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .in('status', ['completed', 'pending', 'upcoming'])
      .not('price', 'is', null)
      .gt('price', 0);
      
    console.log('🚗 June 2025 trips (current logic):', juneTrips);
    
    // Test date-only filtering
    const dateOnlyStart = selectedMonth + '-01';
    const nextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    const dateOnlyEnd = nextMonth.toISOString().split('T')[0];
    
    console.log('📅 Date-only range:', { dateOnlyStart, dateOnlyEnd });
    
    const { data: juneTripsFallback, error: juneTripsFallbackError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', dateOnlyStart)
      .lt('pickup_time', dateOnlyEnd)
      .in('status', ['completed', 'pending', 'upcoming'])
      .not('price', 'is', null)
      .gt('price', 0);
      
    console.log('🚗 June 2025 trips (date-only logic):', juneTripsFallback);
    
    console.log('🔍 Debug Step 5: Check trip statuses...');
    
    // Check what statuses exist
    const statusCounts = {};
    allTrips.forEach(trip => {
      statusCounts[trip.status] = (statusCounts[trip.status] || 0) + 1;
    });
    
    console.log('📊 Trip status distribution:', statusCounts);
    
    console.log('🔍 Debug Step 6: Check individual trip details...');
    
    // Show details for first few trips
    allTrips.slice(0, 5).forEach((trip, index) => {
      const tripDate = new Date(trip.pickup_time);
      const inJune2025 = tripDate >= startDate && tripDate <= endDate;
      const validStatus = ['completed', 'pending', 'upcoming'].includes(trip.status);
      
      console.log(`🚗 Trip ${index + 1}:`, {
        id: trip.id,
        pickup_time: trip.pickup_time,
        status: trip.status,
        price: trip.price,
        user_id: trip.user_id,
        inJune2025,
        validStatus,
        shouldShow: inJune2025 && validStatus
      });
    });
    
    console.log('✅ Debug script completed!');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug function
debugBillingIssue();
