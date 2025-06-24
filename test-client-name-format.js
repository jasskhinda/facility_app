// Test script to verify the billing API returns client names in the correct format
// Run this in Node.js to test the API endpoint directly

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bttzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.o_5KdTJKQGKSp1sMaHdE7v1wGzY5bLN2wApTuKAi6ME';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testClientNameFormat() {
  console.log('🧪 TESTING CLIENT NAME FORMAT IN BILLING API');
  console.log('==============================================');
  
  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Test 1: Check managed clients table directly
    console.log('\n1️⃣ Checking managed clients table...');
    
    const { data: managedClients, error: managedError } = await supabase
      .from('facility_managed_clients')
      .select('id, first_name, last_name, phone_number')
      .eq('facility_id', facilityId)
      .limit(5);
    
    if (managedError) {
      console.log('❌ Error fetching managed clients:', managedError);
    } else if (managedClients && managedClients.length > 0) {
      console.log(`✅ Found ${managedClients.length} managed clients:`);
      managedClients.forEach(client => {
        const formattedName = `${client.first_name} ${client.last_name} (Managed)${client.phone_number ? ` - ${client.phone_number}` : ''}`;
        console.log(`  - ${formattedName}`);
      });
    } else {
      console.log('⚠️ No managed clients found');
    }
    
    // Test 2: Check regular profiles  
    console.log('\n2️⃣ Checking profiles table...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone_number, facility_id')
      .eq('facility_id', facilityId)
      .limit(5);
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError);
    } else if (profiles && profiles.length > 0) {
      console.log(`✅ Found ${profiles.length} facility profiles:`);
      profiles.forEach(profile => {
        const formattedName = `${profile.first_name} ${profile.last_name}${profile.phone_number ? ` - ${profile.phone_number}` : ''}`;
        console.log(`  - ${formattedName}`);
      });
    } else {
      console.log('⚠️ No facility profiles found');
    }
    
    // Test 3: Check trips and expected name format
    console.log('\n3️⃣ Checking recent trips...');
    
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, user_id, managed_client_id, pickup_address')
      .eq('facility_id', facilityId)
      .not('price', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (tripsError) {
      console.log('❌ Error fetching trips:', tripsError);
    } else if (trips && trips.length > 0) {
      console.log(`✅ Found ${trips.length} trips to test name resolution:`);
      
      for (const trip of trips) {
        let expectedName = 'Unknown Client';
        
        if (trip.user_id) {
          const profile = profiles.find(p => p.id === trip.user_id);
          if (profile && profile.first_name) {
            expectedName = `${profile.first_name} ${profile.last_name}${profile.phone_number ? ` - ${profile.phone_number}` : ''}`;
          }
        } else if (trip.managed_client_id) {
          const managedClient = managedClients.find(c => c.id === trip.managed_client_id);
          if (managedClient && managedClient.first_name) {
            expectedName = `${managedClient.first_name} ${managedClient.last_name} (Managed)${managedClient.phone_number ? ` - ${managedClient.phone_number}` : ''}`;
          }
        }
        
        console.log(`  Trip ${trip.id.split('-')[0]}: "${expectedName}"`);
      }
    }
    
    console.log('\n4️⃣ Expected Format Examples:');
    console.log('✅ Authenticated user: "John Smith - (614) 555-0123"');
    console.log('✅ Managed client: "David Patel (Managed) - (416) 555-2233"');
    console.log('✅ No phone: "Sarah Wilson (Managed)"');
    
    console.log('\n🎯 GOAL: Billing table should match booking page format exactly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testClientNameFormat();
