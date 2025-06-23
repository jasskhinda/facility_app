// Emergency Dashboard and Billing Debug Script
console.log('🚨 Emergency Debug Script Starting...');

// Test basic functionality first
console.log('✅ Node.js working');
console.log('✅ Current date:', new Date().toISOString());

// Load environment
try {
  require('dotenv').config({ path: '.env.local' });
  console.log('✅ Environment loaded');
} catch (err) {
  console.log('⚠️ Environment load error:', err.message);
}

// Test Supabase connection
async function emergencyDebug() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log('\n🔍 Testing Dashboard Queries...\n');
    
    // 1. Check facilities
    const { data: facilities, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    if (facilityError || !facilities?.length) {
      console.log('❌ No facilities found:', facilityError?.message);
      return;
    }
    
    console.log('✅ Facility found:', facilities[0].name);
    const facilityId = facilities[0].id;
    
    // 2. Check facility users
    const { data: facilityUsers, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, status')
      .eq('facility_id', facilityId)
      .eq('role', 'facility');
    
    if (userError) {
      console.log('❌ User query error:', userError.message);
      return;
    }
    
    console.log(`✅ Found ${facilityUsers?.length || 0} facility users`);
    if (facilityUsers?.length > 0) {
      console.log('   Sample user:', facilityUsers[0].first_name, facilityUsers[0].last_name, '- Status:', facilityUsers[0].status);
    }
    
    const userIds = facilityUsers?.map(u => u.id) || [];
    
    if (userIds.length === 0) {
      console.log('❌ No facility users found - cannot test trips');
      return;
    }
    
    // 3. Test recent trips query (dashboard issue)
    console.log('\n🔍 Testing Recent Trips Query...');
    
    const { data: recentTrips, error: recentError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        pickup_time,
        status,
        price,
        created_at,
        user:profiles!trips_user_id_fkey(first_name, last_name)
      `)
      .in('user_id', userIds)
      .order('pickup_time', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.log('❌ Recent trips error:', recentError.message);
    } else {
      console.log(`✅ Recent trips query successful: ${recentTrips?.length || 0} trips found`);
      if (recentTrips?.length > 0) {
        console.log('   Sample trip:', {
          client: recentTrips[0].user?.first_name + ' ' + recentTrips[0].user?.last_name,
          date: recentTrips[0].pickup_time,
          status: recentTrips[0].status
        });
      }
    }
    
    // 4. Test billing query for June 2025
    console.log('\n🔍 Testing Billing Query (June 2025)...');
    
    const { data: billingTrips, error: billingError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        pickup_time,
        status,
        price,
        user:profiles!trips_user_id_fkey(first_name, last_name)
      `)
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z')
      .order('pickup_time', { ascending: false });
    
    if (billingError) {
      console.log('❌ Billing trips error:', billingError.message);
    } else {
      console.log(`✅ Billing trips query successful: ${billingTrips?.length || 0} trips found`);
      if (billingTrips?.length > 0) {
        const total = billingTrips.reduce((sum, trip) => sum + (parseFloat(trip.price) || 0), 0);
        console.log('   Total amount:', '$' + total.toFixed(2));
        console.log('   Sample trip:', {
          client: billingTrips[0].user?.first_name + ' ' + billingTrips[0].user?.last_name,
          date: billingTrips[0].pickup_time,
          price: '$' + (billingTrips[0].price || 0)
        });
      }
    }
    
    // 5. Test today's trips
    console.log('\n🔍 Testing Today\'s Trips...');
    
    const { count: todayCount, error: todayError } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .in('user_id', userIds)
      .gte('pickup_time', '2025-06-23T00:00:00Z')
      .lt('pickup_time', '2025-06-24T00:00:00Z');
    
    if (todayError) {
      console.log('❌ Today\'s trips error:', todayError.message);
    } else {
      console.log(`✅ Today's trips: ${todayCount || 0}`);
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('- Facility Users:', facilityUsers?.length || 0);
    console.log('- Recent Trips:', recentTrips?.length || 0);
    console.log('- June 2025 Trips:', billingTrips?.length || 0);
    console.log('- Today\'s Trips:', todayCount || 0);
    
    if (recentTrips?.length === 0) {
      console.log('\n🔧 SOLUTION: Recent trips are empty. Need to add test data.');
    }
    
    if (billingTrips?.length === 0) {
      console.log('\n🔧 SOLUTION: June 2025 trips are empty. Need to add billing test data.');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

emergencyDebug();
