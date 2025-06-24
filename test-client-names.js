// Quick test to check client name data in billing system
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bttzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.o_5KdTJKQGKSp1sMaHdE7v1wGzY5bLN2wApTuKAi6ME';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testClientNameData() {
  console.log('🔍 TESTING CLIENT NAME DATA IN BILLING SYSTEM');
  console.log('==============================================');
  
  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    console.log('\n1️⃣ Checking facility trips...');
    
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
      console.log('\n💡 Let me check if there are ANY trips in the database...');
      
      const { data: allTrips, error: allError } = await supabase
        .from('trips')
        .select('id, facility_id, user_id, managed_client_id, status')
        .limit(10);
      
      if (allError) {
        console.error('❌ Error fetching all trips:', allError);
        return;
      }
      
      console.log(`Found ${allTrips?.length || 0} total trips in database:`);
      allTrips?.forEach((trip, index) => {
        console.log(`  ${index + 1}. Trip ${trip.id.split('-')[0]}: facility_id=${trip.facility_id}, user_id=${trip.user_id}, managed_client_id=${trip.managed_client_id}`);
      });
      
      // If no trips found, let's create some test data
      if (!allTrips || allTrips.length === 0) {
        console.log('\n🛠️ No trips found. Creating test data...');
        await createTestData(facilityId);
        return;
      }
      
      return;
    }
    
    console.log(`✅ Found ${trips.length} trips for facility`);
    
    console.log('\n2️⃣ Getting user profiles for trips...');
    const userIds = [...new Set(trips.filter(trip => trip.user_id).map(trip => trip.user_id))];
    console.log(`User IDs found: ${userIds.length}`);
    
    let userProfiles = [];
    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, facility_id')
        .in('id', userIds);
      
      if (profileError) {
        console.error('❌ Error fetching user profiles:', profileError);
      } else {
        userProfiles = profileData || [];
        console.log(`✅ Found ${userProfiles.length} user profiles:`);
        userProfiles.forEach(profile => {
          console.log(`  - ${profile.first_name} ${profile.last_name} (${profile.role})`);
        });
      }
    }
    
    console.log('\n3️⃣ Getting managed clients for trips...');
    const managedClientIds = [...new Set(trips.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];
    console.log(`Managed client IDs found: ${managedClientIds.length}`);
    
    let managedClients = [];
    if (managedClientIds.length > 0) {
      try {
        const { data: managedData, error: managedError } = await supabase
          .from('managed_clients')
          .select('id, first_name, last_name')
          .in('id', managedClientIds);
        
        if (managedError) {
          console.error('❌ Error fetching managed clients:', managedError);
        } else {
          managedClients = managedData || [];
          console.log(`✅ Found ${managedClients.length} managed clients:`);
          managedClients.forEach(client => {
            console.log(`  - ${client.first_name} ${client.last_name}`);
          });
        }
      } catch (error) {
        console.log('⚠️ managed_clients table might not exist:', error.message);
      }
    }
    
    console.log('\n4️⃣ Testing client name resolution...');
    
    trips.forEach((trip, index) => {
      let clientName = 'Unknown Client';
      let source = 'none';
      
      if (trip.user_id) {
        const userProfile = userProfiles.find(profile => profile.id === trip.user_id);
        if (userProfile && userProfile.first_name) {
          clientName = `${userProfile.first_name} ${userProfile.last_name || ''}`.trim();
          source = 'user_profile';
        }
      } else if (trip.managed_client_id) {
        const managedClient = managedClients.find(client => client.id === trip.managed_client_id);
        if (managedClient && managedClient.first_name) {
          clientName = `${managedClient.first_name} ${managedClient.last_name || ''} (Managed)`.trim();
          source = 'managed_client';
        }
      }
      
      console.log(`Trip ${index + 1}: "${clientName}" (source: ${source})`);
      console.log(`  - user_id: ${trip.user_id || 'null'}`);
      console.log(`  - managed_client_id: ${trip.managed_client_id || 'null'}`);
      console.log(`  - price: $${trip.price || '0'}`);
      console.log(`  - status: ${trip.status}`);
    });
    
    // If all clients are "Unknown", let's check if we need to create some
    const unknownCount = trips.filter(trip => {
      const userProfile = userProfiles.find(profile => profile.id === trip.user_id);
      const managedClient = managedClients.find(client => client.id === trip.managed_client_id);
      return !userProfile && !managedClient;
    }).length;
    
    if (unknownCount === trips.length) {
      console.log('\n⚠️ ALL CLIENTS ARE UNKNOWN - Creating test client data...');
      await createTestClients(facilityId, trips);
    }
    
    console.log('\n✅ CLIENT NAME TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function createTestData(facilityId) {
  console.log('\n🛠️ CREATING TEST DATA...');
  
  try {
    // Create test clients
    const testClients = [
      {
        id: crypto.randomUUID(),
        first_name: 'John',
        last_name: 'Smith',
        email: `john.smith.test.${Date.now()}@example.com`,
        role: 'client',
        facility_id: facilityId
      },
      {
        id: crypto.randomUUID(),
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: `sarah.johnson.test.${Date.now()}@example.com`,
        role: 'client',
        facility_id: facilityId
      }
    ];
    
    const { data: createdClients, error: clientError } = await supabase
      .from('profiles')
      .insert(testClients)
      .select();
    
    if (clientError) {
      console.error('❌ Error creating test clients:', clientError);
      return;
    }
    
    console.log(`✅ Created ${createdClients.length} test clients`);
    
    // Create test trips
    const testTrips = [
      {
        id: crypto.randomUUID(),
        user_id: createdClients[0].id,
        facility_id: facilityId,
        pickup_address: '123 Care Facility Dr, Healthcare City, State 12345',
        destination_address: '456 Medical Center Blvd, Healthcare City, State 12345',
        pickup_time: '2025-06-23T10:00:00.000Z',
        price: 45.00,
        status: 'completed',
        wheelchair_type: 'personal'
      },
      {
        id: crypto.randomUUID(),
        user_id: createdClients[1].id,
        facility_id: facilityId,
        pickup_address: '789 Senior Center Ave, Healthcare City, State 12345',
        destination_address: '321 Specialist Clinic Rd, Healthcare City, State 12345',
        pickup_time: '2025-06-24T14:30:00.000Z',
        price: 52.50,
        status: 'completed',
        wheelchair_type: 'provided'
      }
    ];
    
    const { data: createdTrips, error: tripError } = await supabase
      .from('trips')
      .insert(testTrips)
      .select();
    
    if (tripError) {
      console.error('❌ Error creating test trips:', tripError);
      return;
    }
    
    console.log(`✅ Created ${createdTrips.length} test trips`);
    console.log('\n🎉 Test data created successfully! Re-run the test to see client names.');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

async function createTestClients(facilityId, trips) {
  console.log('\n🛠️ CREATING CLIENT PROFILES FOR EXISTING TRIPS...');
  
  try {
    const clientsToCreate = [];
    
    trips.forEach((trip, index) => {
      if (trip.user_id) {
        clientsToCreate.push({
          id: trip.user_id,
          first_name: `Client${index + 1}`,
          last_name: 'TestUser',
          email: `client${index + 1}.test.${Date.now()}@example.com`,
          role: 'client',
          facility_id: facilityId
        });
      }
    });
    
    if (clientsToCreate.length > 0) {
      const { data: createdClients, error: clientError } = await supabase
        .from('profiles')
        .upsert(clientsToCreate)
        .select();
      
      if (clientError) {
        console.error('❌ Error creating client profiles:', clientError);
      } else {
        console.log(`✅ Created/updated ${createdClients.length} client profiles`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating client profiles:', error);
  }
}

testClientNameData();
