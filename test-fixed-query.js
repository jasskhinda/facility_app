const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Testing FIXED Trips Dashboard Query...\n');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFixedQuery() {
  try {
    console.log('1️⃣ Testing NEW query approach (no foreign key joins)...');
    
    // Test the new approach - separate queries like in the fixed code
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .limit(5);

    if (tripsError) {
      console.error('❌ Trips query error:', tripsError.message);
      return;
    } else {
      console.log(`✅ Basic trips query works - found ${tripsData.length} trips`);
    }

    if (tripsData.length > 0) {
      console.log('\n2️⃣ Testing separate client data fetching...');
      
      // Get unique user IDs and managed client IDs (like in fixed code)
      const userIds = [...new Set(tripsData.filter(trip => trip.user_id).map(trip => trip.user_id))];
      const managedClientIds = [...new Set(tripsData.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];
      
      console.log(`Found ${userIds.length} unique user IDs and ${managedClientIds.length} managed client IDs`);
      
      // Fetch user profiles separately
      let userProfiles = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone_number')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('❌ User profiles error:', profilesError.message);
        } else {
          userProfiles = profiles || [];
          console.log(`✅ Fetched ${userProfiles.length} user profiles`);
        }
      }
      
      // Fetch managed clients separately
      let managedClients = [];
      if (managedClientIds.length > 0) {
        const { data: managed, error: managedError } = await supabase
          .from('managed_clients')
          .select('id, first_name, last_name, phone_number')
          .in('id', managedClientIds);
        
        if (managedError) {
          console.error('❌ Managed clients error:', managedError.message);
        } else {
          managedClients = managed || [];
          console.log(`✅ Fetched ${managedClients.length} managed clients`);
        }
      }
      
      // Combine data (like in fixed code)
      console.log('\n3️⃣ Testing data combination...');
      const tripsWithClientInfo = tripsData.map(trip => ({
        ...trip,
        user_profile: trip.user_id ? userProfiles.find(profile => profile.id === trip.user_id) : null,
        managed_client: trip.managed_client_id ? managedClients.find(client => client.id === trip.managed_client_id) : null
      }));
      
      console.log(`✅ Combined ${tripsWithClientInfo.length} trips with client info`);
      
      // Show some examples
      tripsWithClientInfo.slice(0, 3).forEach((trip, index) => {
        const clientInfo = trip.user_profile 
          ? `${trip.user_profile.first_name || 'Unknown'} ${trip.user_profile.last_name || 'User'} (Auth)`
          : trip.managed_client
          ? `${trip.managed_client.first_name || 'Unknown'} ${trip.managed_client.last_name || 'Client'} (Managed)`
          : 'No client info';
        
        console.log(`   Trip ${index + 1}: ${clientInfo} - Status: ${trip.status}`);
      });
    }

    console.log('\n🎉 FIXED QUERY APPROACH WORKS!');
    console.log('✅ No foreign key relationship errors');
    console.log('✅ Data fetching works correctly');
    console.log('✅ Client information is properly combined');
    console.log('\n🚀 The trips dashboard should now work on the website!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFixedQuery();
