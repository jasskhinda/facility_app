// BILLING VS TRIPS MISMATCH DIAGNOSTIC
// Run this in browser console to identify the exact issue

console.log('🔍 BILLING vs TRIPS MISMATCH DIAGNOSTIC');

async function diagnoseBillingTripsIssue() {
  try {
    if (!window.supabase) {
      console.error('❌ Supabase client not available');
      return;
    }

    // Get current session
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      console.error('❌ No session found');
      return;
    }

    console.log('✅ Session found');
    console.log('User ID:', session.user.id);
    console.log('Email:', session.user.email);

    // Get current user profile
    const { data: currentProfile } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    console.log('\n📊 CURRENT USER PROFILE:');
    console.log(currentProfile);

    // Check all trips for this user
    const { data: userTrips } = await window.supabase
      .from('trips')
      .select('*')
      .eq('user_id', session.user.id)
      .order('pickup_time', { ascending: false });

    console.log('\n🚗 TRIPS FOR CURRENT USER:');
    console.log('Total trips:', userTrips?.length || 0);
    if (userTrips?.length > 0) {
      userTrips.forEach((trip, index) => {
        console.log(`${index + 1}. ${trip.pickup_time} - ${trip.status} - $${trip.price || 'No price'}`);
      });
    }

    // Check what the billing component is looking for
    console.log('\n🏥 BILLING COMPONENT LOGIC:');
    console.log('Looking for users with:');
    console.log('- facility_id:', currentProfile?.facility_id);
    console.log('- role: facility');

    // Get facility users (what billing component queries)
    const { data: facilityUsers } = await window.supabase
      .from('profiles')
      .select('id, first_name, last_name, role, facility_id')
      .eq('facility_id', currentProfile?.facility_id || 'none')
      .eq('role', 'facility');

    console.log('\n👥 FACILITY USERS FOUND:');
    console.log('Count:', facilityUsers?.length || 0);
    facilityUsers?.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.id})`);
    });

    // Check trips for facility users
    if (facilityUsers?.length > 0) {
      const facilityUserIds = facilityUsers.map(u => u.id);
      const { data: facilityTrips } = await window.supabase
        .from('trips')
        .select('*')
        .in('user_id', facilityUserIds)
        .gte('pickup_time', '2025-06-01T00:00:00Z')
        .lt('pickup_time', '2025-07-01T00:00:00Z');

      console.log('\n📅 JUNE 2025 TRIPS FOR FACILITY USERS:');
      console.log('Count:', facilityTrips?.length || 0);
    }

    // DIAGNOSIS
    console.log('\n🎯 DIAGNOSIS:');
    
    if (currentProfile?.role !== 'facility') {
      console.log('❌ ISSUE: Current user role is not "facility"');
      console.log('Current role:', currentProfile?.role);
      console.log('👉 FIX: Update user role to "facility"');
    }
    
    if (!currentProfile?.facility_id) {
      console.log('❌ ISSUE: Current user has no facility_id');
      console.log('👉 FIX: Assign facility_id to user');
    }

    if (userTrips?.length > 0 && currentProfile?.role !== 'facility') {
      console.log('❌ ISSUE: Trips exist but user is not a facility user');
      console.log('Trips belong to user with role:', currentProfile?.role);
      console.log('Billing component only shows trips for facility users');
      console.log('👉 FIX: Either:');
      console.log('  1. Change user role to "facility" and assign facility_id');
      console.log('  2. OR transfer trips to a facility user');
    }

    // Generate fix SQL
    console.log('\n🔧 SUGGESTED SQL FIX:');
    console.log(`
-- Fix 1: Update current user to be a facility user
UPDATE profiles 
SET 
  role = 'facility',
  facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
WHERE id = '${session.user.id}';

-- Fix 2: Create facility if it doesn't exist
INSERT INTO facilities (id, name, billing_email, address, phone_number)
VALUES (
  'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
  'Compassionate Care Transportation',
  'billing@compassionatecaretransportation.com',
  '5050 Blazer Pkwy # 100, Dublin, OH 43017',
  '(614) 555-0123'
)
ON CONFLICT (id) DO NOTHING;

-- Verify fix
SELECT p.*, u.email 
FROM profiles p 
JOIN auth.users u ON u.id = p.id 
WHERE p.id = '${session.user.id}';
    `);

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

diagnoseBillingTripsIssue();
