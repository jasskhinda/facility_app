// Direct database query to debug client names
console.log('🔍 DEBUGGING CLIENT NAMES - Direct Database Query');
console.log('================================================');

async function debugDatabase() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = 'https://bttzfgasugkycbavcwvnx.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.o_5KdTJKQGKSp1sMaHdE7v1wGzY5bLN2wApTuKAi6ME';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('\n1️⃣ Checking facility trips...');
    
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Get facility trips with all relevant data
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
      .limit(10);
    
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }
    
    console.log(`✅ Found ${trips?.length || 0} trips for facility`);
    
    if (!trips || trips.length === 0) {
      console.log('❌ No trips found. Checking if any trips exist...');
      
      const { data: allTrips, error: allError } = await supabase
        .from('trips')
        .select('id, facility_id, user_id, managed_client_id')
        .limit(5);
      
      if (allError) {
        console.error('❌ Error fetching all trips:', allError);
      } else {
        console.log(`Found ${allTrips?.length || 0} total trips in database:`);
        allTrips?.forEach(trip => {
          console.log(`  - Trip ${trip.id}: facility_id=${trip.facility_id}, user_id=${trip.user_id}, managed_client_id=${trip.managed_client_id}`);
        });
      }
      return;
    }
    
    console.log('\nTrip details:');
    trips.forEach((trip, index) => {
      console.log(`  ${index + 1}. Trip ${trip.id.split('-')[0]}:`);
      console.log(`     - user_id: ${trip.user_id || 'null'}`);
      console.log(`     - managed_client_id: ${trip.managed_client_id || 'null'}`);
      console.log(`     - status: ${trip.status}`);
      console.log(`     - price: $${trip.price || '0'}`);
      console.log(`     - pickup: ${trip.pickup_address?.substring(0, 50) || 'N/A'}...`);
    });
    
    console.log('\n2️⃣ Checking user profiles...');
    
    // Get user profiles for trips
    const userIds = [...new Set(trips.filter(trip => trip.user_id).map(trip => trip.user_id))];
    console.log(`Found ${userIds.length} unique user IDs:`, userIds);
    
    if (userIds.length > 0) {
      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, facility_id')
        .in('id', userIds);
      
      if (profileError) {
        console.error('❌ Error fetching user profiles:', profileError);
      } else {
        console.log(`✅ Found ${userProfiles?.length || 0} user profiles:`);
        userProfiles?.forEach(profile => {
          console.log(`  - ${profile.id}: "${profile.first_name} ${profile.last_name}" (${profile.role})`);
        });
      }
    }
    
    console.log('\n3️⃣ Checking managed clients...');
    
    // Get managed clients for trips
    const managedClientIds = [...new Set(trips.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];
    console.log(`Found ${managedClientIds.length} unique managed client IDs:`, managedClientIds);
    
    if (managedClientIds.length > 0) {
      try {
        const { data: managedClients, error: managedError } = await supabase
          .from('managed_clients')
          .select('id, first_name, last_name')
          .in('id', managedClientIds);
        
        if (managedError) {
          console.error('❌ Error fetching managed clients:', managedError);
        } else {
          console.log(`✅ Found ${managedClients?.length || 0} managed clients:`);
          managedClients?.forEach(client => {
            console.log(`  - ${client.id}: "${client.first_name} ${client.last_name}"`);
          });
        }
      } catch (error) {
        console.log('⚠️ managed_clients table might not exist:', error.message);
      }
    }
    
    console.log('\n4️⃣ Simulating client name resolution...');
    
    // Simulate the client name resolution logic
    if (trips.length > 0) {
      const userProfiles = userIds.length > 0 ? 
        (await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)).data || [] : [];
      
      let managedClients = [];
      if (managedClientIds.length > 0) {
        try {
          managedClients = (await supabase.from('managed_clients').select('id, first_name, last_name').in('id', managedClientIds)).data || [];
        } catch (e) {
          console.log('managed_clients table not accessible');
        }
      }
      
      console.log('\nClient name resolution results:');
      trips.slice(0, 5).forEach((trip, index) => {
        let clientName = 'Unknown Client';
        
        if (trip.user_id) {
          const userProfile = userProfiles.find(profile => profile.id === trip.user_id);
          if (userProfile && userProfile.first_name) {
            clientName = `${userProfile.first_name} ${userProfile.last_name || ''}`.trim();
          }
        } else if (trip.managed_client_id) {
          const managedClient = managedClients.find(client => client.id === trip.managed_client_id);
          if (managedClient && managedClient.first_name) {
            clientName = `${managedClient.first_name} ${managedClient.last_name || ''} (Managed)`.trim();
          }
        }
        
        console.log(`  ${index + 1}. Trip ${trip.id.split('-')[0]}: "${clientName}"`);
        console.log(`     - Logic: user_id=${trip.user_id}, managed_client_id=${trip.managed_client_id}`);
      });
    }
    
    console.log('\n✅ DIAGNOSIS COMPLETE');
    console.log('====================');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugDatabase();
