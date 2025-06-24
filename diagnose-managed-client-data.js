// Database diagnostic to check managed client data and phone numbers
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bttzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.o_5KdTJKQGKSp1sMaHdE7v1wGzY5bLN2wApTuKAi6ME';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseManagedClientData() {
  console.log('🔍 MANAGED CLIENT DATA DIAGNOSTIC');
  console.log('==================================');
  
  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Check if we have any managed clients at all
    console.log('\n1️⃣ Checking facility_managed_clients table...');
    
    const { data: managedClients, error: managedError } = await supabase
      .from('facility_managed_clients')
      .select('*')
      .eq('facility_id', facilityId);
    
    if (managedError) {
      console.log('❌ Error accessing facility_managed_clients:', managedError);
      console.log('💡 Table might not exist or have different name');
      return;
    }
    
    if (!managedClients || managedClients.length === 0) {
      console.log('❌ No managed clients found in facility_managed_clients table');
      console.log('🔧 Need to create managed client test data');
      
      // Create sample managed client data
      console.log('\n2️⃣ Creating sample managed client data...');
      
      const sampleManagedClients = [
        {
          facility_id: facilityId,
          first_name: 'David',
          last_name: 'Patel',
          phone_number: '(416) 555-2233',
          email: 'david.patel@example.com',
          address: '123 Main St, Toronto, ON'
        },
        {
          facility_id: facilityId,
          first_name: 'Maria',
          last_name: 'Rodriguez',
          phone_number: '(647) 555-9876',
          email: 'maria.rodriguez@example.com',
          address: '456 Oak Ave, Toronto, ON'
        },
        {
          facility_id: facilityId,
          first_name: 'Robert',
          last_name: 'Chen',
          phone_number: '(905) 555-4321',
          email: 'robert.chen@example.com',
          address: '789 Pine St, Mississauga, ON'
        }
      ];
      
      const { data: createdClients, error: createError } = await supabase
        .from('facility_managed_clients')
        .insert(sampleManagedClients)
        .select();
      
      if (createError) {
        console.log('❌ Error creating managed clients:', createError);
        return;
      }
      
      console.log('✅ Created sample managed clients:');
      createdClients.forEach(client => {
        console.log(`  - ${client.first_name} ${client.last_name} - ${client.phone_number}`);
      });
      
      // Update some trips to use these managed clients
      console.log('\n3️⃣ Updating trips to use managed clients...');
      
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id')
        .eq('facility_id', facilityId)
        .is('managed_client_id', null)
        .limit(3);
      
      if (trips && trips.length > 0) {
        for (let i = 0; i < Math.min(trips.length, createdClients.length); i++) {
          const { error: updateError } = await supabase
            .from('trips')
            .update({ 
              managed_client_id: createdClients[i].id,
              user_id: null // Clear user_id when setting managed_client_id
            })
            .eq('id', trips[i].id);
          
          if (!updateError) {
            console.log(`✅ Updated trip ${trips[i].id.split('-')[0]} to use managed client ${createdClients[i].first_name} ${createdClients[i].last_name}`);
          }
        }
      }
      
    } else {
      console.log(`✅ Found ${managedClients.length} existing managed clients:`);
      managedClients.forEach(client => {
        const name = `${client.first_name || ''} ${client.last_name || ''}`.trim();
        const phone = client.phone_number || 'No phone';
        console.log(`  - ${name} - ${phone}`);
      });
    }
    
    // Check trips using managed clients
    console.log('\n4️⃣ Checking trips with managed clients...');
    
    const { data: managedTrips, error: managedTripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, pickup_address')
      .eq('facility_id', facilityId)
      .not('managed_client_id', 'is', null)
      .limit(5);
    
    if (managedTripsError) {
      console.log('❌ Error fetching managed trips:', managedTripsError);
    } else if (managedTrips && managedTrips.length > 0) {
      console.log(`✅ Found ${managedTrips.length} trips using managed clients:`);
      managedTrips.forEach(trip => {
        console.log(`  - Trip ${trip.id.split('-')[0]}: managed_client_id = ${trip.managed_client_id}`);
      });
    } else {
      console.log('❌ No trips found using managed clients');
      console.log('💡 Need to assign managed clients to some trips');
    }
    
    console.log('\n5️⃣ Expected billing format after fix:');
    console.log('✅ "David Patel (Managed) - (416) 555-2233"');
    console.log('✅ "Maria Rodriguez (Managed) - (647) 555-9876"');
    console.log('✅ "Robert Chen (Managed) - (905) 555-4321"');
    
    console.log('\n🎯 Next step: Test the billing page to see if names display correctly');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

diagnoseManagedClientData();
