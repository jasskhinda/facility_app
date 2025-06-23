// URGENT: Test the billing fix in browser console
// Copy and paste this entire script into the browser console on the billing page

console.log('🚨 TESTING BILLING FIX - TRIP OWNERSHIP');
console.log('=====================================');

async function testBillingFix() {
  try {
    // Get current user session
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

    if (!profile.facility_id) {
      console.log('❌ No facility_id - this user cannot access billing');
      return;
    }

    // OLD APPROACH (BROKEN): Look for facility staff only
    const { data: facilityStaff } = await window.supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'facility');

    console.log('\n🔴 OLD APPROACH - Facility Staff Only:');
    console.log('Count:', facilityStaff?.length || 0);
    facilityStaff?.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.role})`);
    });

    // NEW APPROACH (FIXED): Look for ALL facility users (staff + clients)
    const { data: allFacilityUsers } = await window.supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('facility_id', profile.facility_id);

    console.log('\n🟢 NEW APPROACH - All Facility Users:');
    console.log('Count:', allFacilityUsers?.length || 0);
    allFacilityUsers?.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.role})`);
    });

    // Test trip queries with both approaches
    if (facilityStaff?.length > 0) {
      const staffUserIds = facilityStaff.map(u => u.id);
      const { data: staffTrips } = await window.supabase
        .from('trips')
        .select('*')
        .in('user_id', staffUserIds)
        .gte('pickup_time', '2025-06-01T00:00:00Z')
        .lt('pickup_time', '2025-07-01T00:00:00Z');

      console.log('\n🔴 OLD APPROACH - Trips for facility staff:', staffTrips?.length || 0);
    }

    if (allFacilityUsers?.length > 0) {
      const allUserIds = allFacilityUsers.map(u => u.id);
      const { data: allTrips } = await window.supabase
        .from('trips')
        .select('*')
        .in('user_id', allUserIds)
        .gte('pickup_time', '2025-06-01T00:00:00Z')
        .lt('pickup_time', '2025-07-01T00:00:00Z');

      console.log('\n🟢 NEW APPROACH - Trips for all facility users:', allTrips?.length || 0);
      
      if (allTrips?.length > 0) {
        console.log('\n📋 Sample trips found:');
        allTrips.slice(0, 5).forEach(trip => {
          console.log(`- ${new Date(trip.pickup_time).toDateString()}: $${trip.price} (${trip.status})`);
        });

        // Calculate billing totals
        const completed = allTrips.filter(t => t.status === 'completed');
        const billableAmount = completed.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
        
        console.log('\n💰 BILLING TOTALS:');
        console.log('- Total trips:', allTrips.length);
        console.log('- Completed trips:', completed.length);
        console.log('- Billable amount: $' + billableAmount.toFixed(2));
      }
    }

    console.log('\n🎯 CONCLUSION:');
    if ((facilityStaff?.length || 0) > (allFacilityUsers?.length || 0)) {
      console.log('❌ Something is wrong - staff count > total users');
    } else if (allFacilityUsers?.length > 0) {
      console.log('✅ Fix should work - found facility users');
    } else {
      console.log('❌ No facility users found at all');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBillingFix();
