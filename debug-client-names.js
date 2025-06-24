// Debug script to check client names in billing data
console.log('🔍 DEBUGGING CLIENT NAMES IN BILLING SYSTEM');
console.log('==============================================');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bttzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugClientNames() {
  try {
    console.log('\n1️⃣ STEP 1: Checking facility trips...');
    
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Get facility trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        status,
        price,
        user_id,
        managed_client_id,
        facility_id
      `)
      .eq('facility_id', facilityId)
      .limit(5);
    
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }
    
    if (!trips || trips.length === 0) {
      console.log('❌ No trips found for facility:', facilityId);
      return;
    }
    
    console.log(`✅ Found ${trips.length} trips for facility`);
    console.log('Trip details:');
    trips.forEach((trip, index) => {
      console.log(`  ${index + 1}. Trip ${trip.id.split('-')[0]}:`);
      console.log(`     - user_id: ${trip.user_id || 'null'}`);
      console.log(`     - managed_client_id: ${trip.managed_client_id || 'null'}`);
      console.log(`     - status: ${trip.status}`);
      console.log(`     - price: $${trip.price || '0'}`);
    });
    
    console.log('\n2️⃣ STEP 2: Checking user profiles...');
    
    // Get unique user IDs
    const userIds = [...new Set(trips.filter(trip => trip.user_id).map(trip => trip.user_id))];
    console.log('User IDs to fetch:', userIds);
    
    if (userIds.length > 0) {
      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, facility_id')
        .in('id', userIds);
      
      if (profileError) {
        console.error('❌ Error fetching user profiles:', profileError);
      } else {
        console.log(`✅ Found ${userProfiles.length} user profiles:`);
        userProfiles.forEach(profile => {
          console.log(`  - ${profile.id}: ${profile.first_name} ${profile.last_name} (${profile.role})`);
        });
      }
    } else {
      console.log('ℹ️ No user IDs found in trips');
    }
    
    console.log('\n3️⃣ STEP 3: Checking managed clients...');
    
    // Get unique managed client IDs
    const managedClientIds = [...new Set(trips.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];
    console.log('Managed client IDs to fetch:', managedClientIds);
    
    if (managedClientIds.length > 0) {
      try {
        const { data: managedClients, error: managedError } = await supabase
          .from('managed_clients')
          .select('id, first_name, last_name')
          .in('id', managedClientIds);
        
        if (managedError) {
          console.error('❌ Error fetching managed clients:', managedError);
        } else {
          console.log(`✅ Found ${managedClients.length} managed clients:`);
          managedClients.forEach(client => {
            console.log(`  - ${client.id}: ${client.first_name} ${client.last_name}`);
          });
        }
      } catch (error) {
        console.log('⚠️ managed_clients table might not exist:', error.message);
      }
    } else {
      console.log('ℹ️ No managed client IDs found in trips');
    }
    
    console.log('\n4️⃣ STEP 4: Testing API endpoint...');
    
    // Test the actual API endpoint
    const baseUrl = 'http://localhost:3007';
    const apiUrl = `${baseUrl}/api/facility/trips-billing?year=2025&month=6`;
    
    console.log('Testing API URL:', apiUrl);
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error:', data.error);
        return;
      }
      
      console.log(`✅ API returned ${data.bills?.length || 0} bills`);
      
      if (data.bills && data.bills.length > 0) {
        console.log('\nClient names in API response:');
        data.bills.slice(0, 5).forEach((bill, index) => {
          console.log(`  ${index + 1}. Bill ${bill.bill_number}: "${bill.client_name}"`);
          console.log(`     - client_id: ${bill.client_id}`);
          console.log(`     - amount: $${bill.amount}`);
        });
      }
      
    } catch (fetchError) {
      console.error('❌ Error calling API:', fetchError.message);
      console.log('💡 Make sure the dev server is running on localhost:3007');
    }
    
    console.log('\n✅ DEBUG COMPLETE');
    console.log('================');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugClientNames();
