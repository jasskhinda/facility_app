// EMERGENCY BILLING DEBUG - Run this in browser console
// Paste this entire script into the console on the billing page

console.log('🚨 EMERGENCY BILLING DEBUG STARTED');

// Function to debug the current state
function debugBillingState() {
  console.log('🔍 Current Page State:');
  console.log('- URL:', window.location.href);
  console.log('- Month selector value:', document.querySelector('select')?.value);
  console.log('- Error message element:', document.querySelector('[class*="bg-red"]')?.textContent);
  console.log('- Total trips element:', document.querySelector('[class*="text-2xl font-bold"]')?.textContent);
}

// Function to test trip queries directly
async function testTripQueries() {
  console.log('🧪 Testing trip queries directly...');
  
  // Try to get supabase client
  const supabase = window.supabaseClient || window._supabaseClient;
  if (!supabase) {
    console.error('❌ Cannot access Supabase client');
    return;
  }
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    console.log('👤 Current user:', user.id);
    
    // Get user's facility
    const { data: profile } = await supabase
      .from('profiles')
      .select('facility_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.facility_id) {
      console.error('❌ User has no facility_id');
      return;
    }
    
    console.log('🏢 Facility ID:', profile.facility_id);
    
    // Get facility users
    const { data: facilityUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('facility_id', profile.facility_id);
    
    console.log('👥 Facility users:', facilityUsers?.length || 0);
    
    if (!facilityUsers?.length) {
      console.error('❌ No facility users found');
      return;
    }
    
    const facilityUserIds = facilityUsers.map(u => u.id);
    
    // Test ALL trips for facility users
    const { data: allTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });
    
    console.log('🚗 ALL trips for facility:', allTrips?.length || 0);
    
    if (allTrips?.length > 0) {
      // Group by month
      const tripsByMonth = {};
      allTrips.forEach(trip => {
        const date = new Date(trip.pickup_time);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!tripsByMonth[monthKey]) tripsByMonth[monthKey] = [];
        tripsByMonth[monthKey].push(trip);
      });
      
      console.log('📊 Trips by month:', tripsByMonth);
      
      // Test June 2025 specifically
      const june2025Trips = allTrips.filter(trip => {
        const date = new Date(trip.pickup_time);
        return date.getFullYear() === 2025 && date.getMonth() === 5; // June is month 5 (0-based)
      });
      
      console.log('🚗 June 2025 trips found:', june2025Trips.length);
      console.log('June 2025 trip details:', june2025Trips);
      
      // Test the exact query from the component
      const { data: componentQuery } = await supabase
        .from('trips')
        .select('*')
        .in('user_id', facilityUserIds)
        .gte('pickup_time', '2025-06-01T00:00:00.000Z')
        .lte('pickup_time', '2025-06-30T23:59:59.999Z')
        .in('status', ['completed', 'pending', 'upcoming'])
        .not('price', 'is', null)
        .gt('price', 0);
      
      console.log('🔍 Component query result:', componentQuery?.length || 0);
      console.log('Component query details:', componentQuery);
      
      // Test fallback query
      const { data: fallbackQuery } = await supabase
        .from('trips')
        .select('*')
        .in('user_id', facilityUserIds)
        .gte('pickup_time', '2025-06-01')
        .lt('pickup_time', '2025-07-01')
        .in('status', ['completed', 'pending', 'upcoming'])
        .not('price', 'is', null)
        .gt('price', 0);
      
      console.log('🔄 Fallback query result:', fallbackQuery?.length || 0);
      console.log('Fallback query details:', fallbackQuery);
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Function to fix the month display
function fixMonthDisplay() {
  console.log('🔧 Attempting to fix month display...');
  
  const select = document.querySelector('select');
  if (select) {
    console.log('📅 Current select value:', select.value);
    // Trigger a change event to refresh the component
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// Run all debug functions
debugBillingState();
testTripQueries();

// Set up a periodic check
let checkCount = 0;
const periodicCheck = setInterval(() => {
  checkCount++;
  console.log(`🔄 Periodic check #${checkCount}`);
  debugBillingState();
  
  if (checkCount >= 5) {
    clearInterval(periodicCheck);
    console.log('✅ Debug monitoring stopped after 5 checks');
  }
}, 3000);

console.log('🚨 EMERGENCY BILLING DEBUG COMPLETE - Check logs above');
