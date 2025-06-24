#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function debugManagedClients() {
  console.log('🔍 MANAGED CLIENT DIAGNOSTIC');
  console.log('============================');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Check facility_managed_clients table
    console.log('\n1️⃣ Checking facility_managed_clients table...');
    
    const { data: fmc, error: fmcError } = await supabase
      .from('facility_managed_clients')
      .select('id, first_name, last_name, phone_number')
      .limit(5);
    
    if (fmcError) {
      console.log('❌ facility_managed_clients error:', fmcError.message);
    } else {
      console.log(`✅ facility_managed_clients found: ${fmc.length} records`);
      fmc.forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.first_name} ${client.last_name} - ${client.phone_number || 'No phone'} (${client.id.slice(0, 8)}...)`);
      });
    }
    
    // 2. Check managed_clients table
    console.log('\n2️⃣ Checking managed_clients table...');
    
    const { data: mc, error: mcError } = await supabase
      .from('managed_clients')
      .select('id, first_name, last_name, phone_number, name, client_name')
      .limit(5);
    
    if (mcError) {
      console.log('❌ managed_clients error:', mcError.message);
    } else {
      console.log(`✅ managed_clients found: ${mc.length} records`);
      mc.forEach((client, index) => {
        const name = client.first_name ? `${client.first_name} ${client.last_name}` : 
                     client.name || client.client_name || 'No name';
        console.log(`  ${index + 1}. ${name} - ${client.phone_number || 'No phone'} (${client.id.slice(0, 8)}...)`);
      });
    }
    
    // 3. Check trips with managed_client_id
    console.log('\n3️⃣ Checking trips with managed_client_id...');
    
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, pickup_address')
      .not('managed_client_id', 'is', null)
      .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3')
      .limit(5);
    
    if (tripsError) {
      console.log('❌ trips error:', tripsError.message);
    } else {
      console.log(`✅ facility trips with managed_client_id: ${trips.length}`);
      trips.forEach((trip, index) => {
        console.log(`  ${index + 1}. Trip ${trip.id.slice(0, 8)} -> Client ${trip.managed_client_id.slice(0, 8)} (${trip.pickup_address.substring(0, 30)}...)`);
      });
    }
    
    // 4. Try to match trip managed_client_ids with available clients
    if (trips && trips.length > 0) {
      console.log('\n4️⃣ Matching trip client IDs with available clients...');
      
      const managedClientIds = trips.map(t => t.managed_client_id);
      
      // Try facility_managed_clients first
      const { data: matchedFMC, error: matchFMCError } = await supabase
        .from('facility_managed_clients')
        .select('id, first_name, last_name, phone_number')
        .in('id', managedClientIds);
      
      if (!matchFMCError && matchedFMC) {
        console.log(`✅ Found ${matchedFMC.length} matches in facility_managed_clients`);
        matchedFMC.forEach(client => {
          console.log(`  -> ${client.first_name} ${client.last_name} (${client.id.slice(0, 8)})`);
        });
      }
      
      // Try managed_clients
      const { data: matchedMC, error: matchMCError } = await supabase
        .from('managed_clients')
        .select('id, first_name, last_name, name, client_name, phone_number')
        .in('id', managedClientIds);
      
      if (!matchMCError && matchedMC) {
        console.log(`✅ Found ${matchedMC.length} matches in managed_clients`);
        matchedMC.forEach(client => {
          const name = client.first_name ? `${client.first_name} ${client.last_name}` : 
                       client.name || client.client_name || 'No name';
          console.log(`  -> ${name} (${client.id.slice(0, 8)})`);
        });
      }
      
      // Show unmatched IDs
      const matchedIds = [...(matchedFMC || []), ...(matchedMC || [])].map(c => c.id);
      const unmatchedIds = managedClientIds.filter(id => !matchedIds.includes(id));
      
      if (unmatchedIds.length > 0) {
        console.log(`❌ ${unmatchedIds.length} unmatched client IDs:`);
        unmatchedIds.forEach(id => {
          console.log(`  -> ${id.slice(0, 8)}... (needs client record)`);
        });
      }
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    
    if (fmc && fmc.length > 0) {
      console.log('✅ Use facility_managed_clients table (has data)');
    } else if (mc && mc.length > 0) {
      console.log('✅ Use managed_clients table (has data)');
    } else {
      console.log('❌ No managed client data found - need to create test data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugManagedClients();
