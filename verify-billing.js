const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 VERIFYING BILLING FIX...');
console.log('============================');

async function verifyBillingFix() {
  try {
    console.log('\n1️⃣ Getting facility users...');
    const { data: facilityUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3');
    
    if (usersError) {
      console.log('❌ Error:', usersError.message);
      return;
    }
    
    console.log(`✅ Found ${facilityUsers?.length || 0} facility users`);
    facilityUsers?.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (${user.id})`);
    });
    
    if (!facilityUsers || facilityUsers.length === 0) {
      console.log('❌ No users found - this explains the 0 trips issue!');
      return;
    }
    
    console.log('\n2️⃣ Getting trips for facility users...');
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, pickup_address, destination_address, pickup_time, price, status, user_id')
      .in('user_id', facilityUsers.map(u => u.id))
      .not('price', 'is', null)
      .gt('price', 0);
    
    if (tripsError) {
      console.log('❌ Error:', tripsError.message);
      return;
    }
    
    console.log(`✅ Found ${trips?.length || 0} billable trips!`);
    
    if (trips && trips.length > 0) {
      const total = trips.reduce((sum, t) => sum + parseFloat(t.price), 0);
      console.log(`💰 Total revenue: $${total.toFixed(2)}`);
      
      console.log('\n📋 Trip details:');
      trips.forEach(trip => {
        const user = facilityUsers.find(u => u.id === trip.user_id);
        const userName = user ? `${user.first_name} ${user.last_name}` : 'Unknown';
        console.log(`   - $${trip.price} | ${userName} | ${trip.status}`);
        console.log(`     ${trip.pickup_address}`);
        console.log(`     → ${trip.destination_address}`);
      });
      
      // Test current month filtering
      console.log('\n3️⃣ Testing current month filtering...');
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data: monthlyTrips } = await supabase
        .from('trips')
        .select('id, price, pickup_time, status')
        .in('user_id', facilityUsers.map(u => u.id))
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString())
        .in('status', ['completed', 'pending', 'upcoming'])
        .not('price', 'is', null)
        .gt('price', 0);
      
      console.log(`✅ Current month trips: ${monthlyTrips?.length || 0}`);
      if (monthlyTrips && monthlyTrips.length > 0) {
        const monthlyTotal = monthlyTrips.reduce((sum, t) => sum + parseFloat(t.price), 0);
        console.log(`💰 Current month revenue: $${monthlyTotal.toFixed(2)}`);
      }
      
      console.log('\n🎉 SUCCESS! The fix should work!');
      console.log('✅ FacilityBillingComponent will now find trips using user-based lookup');
      
    } else {
      console.log('❌ No billable trips found');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyBillingFix();
      console.log('✅ Billing system ready!');
    }
  })
  .catch(console.error);
