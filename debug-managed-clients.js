#!/usr/bin/env node

// Quick diagnostic to check managed_clients table structure and data
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function diagnoseManagedClients() {
  console.log('🔍 MANAGED CLIENTS DIAGNOSTIC');
  console.log('============================');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // First, let's see if the table exists and what columns it has
    console.log('\n1️⃣ Checking managed_clients table structure...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'managed_clients' })
      .single();
    
    if (tableError) {
      console.log('⚠️ Could not get table info via RPC, trying direct query...');
      
      // Try a simple select to see what columns exist
      const { data: sampleData, error: sampleError } = await supabase
        .from('managed_clients')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log('❌ managed_clients table error:', sampleError.message);
        return;
      }
      
      if (sampleData && sampleData.length > 0) {
        console.log('✅ Table exists! Sample record columns:', Object.keys(sampleData[0]));
        console.log('Sample record:', sampleData[0]);
      } else {
        console.log('⚠️ Table exists but is empty');
      }
    }
    
    // Now let's check for specific managed client IDs from recent trips
    console.log('\n2️⃣ Checking for managed client records...');
    
    const { data: allManagedClients, error: allError } = await supabase
      .from('managed_clients')
      .select('*')
      .limit(10);
    
    if (allError) {
      console.log('❌ Error fetching managed clients:', allError.message);
    } else {
      console.log(`✅ Found ${allManagedClients.length} managed clients in total`);
      
      allManagedClients.forEach((client, index) => {
        if (index < 3) { // Show first 3
          console.log(`Client ${index + 1}:`, {
            id: client.id,
            first_name: client.first_name || 'N/A',
            last_name: client.last_name || 'N/A',
            name: client.name || 'N/A',
            client_name: client.client_name || 'N/A',
            all_columns: Object.keys(client)
          });
        }
      });
    }
    
    // Check if the specific ID 'ea79223a' exists
    console.log('\n3️⃣ Checking for specific managed client ID...');
    
    const { data: specificClient, error: specificError } = await supabase
      .from('managed_clients')
      .select('*')
      .like('id', '%ea79223a%');
    
    if (specificError) {
      console.log('❌ Error searching for specific client:', specificError.message);
    } else if (specificClient && specificClient.length > 0) {
      console.log('✅ Found the specific client:', specificClient[0]);
    } else {
      console.log('❌ Client with ID containing "ea79223a" not found');
    }
    
    // Let's also check trips to see the actual managed_client_id values
    console.log('\n4️⃣ Checking recent trips with managed_client_id...');
    
    const { data: tripsWithManaged, error: tripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, pickup_address')
      .not('managed_client_id', 'is', null)
      .limit(5);
    
    if (tripsError) {
      console.log('❌ Error fetching trips:', tripsError.message);
    } else {
      console.log(`✅ Found ${tripsWithManaged.length} trips with managed_client_id`);
      tripsWithManaged.forEach((trip, index) => {
        console.log(`Trip ${index + 1}: managed_client_id = ${trip.managed_client_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

diagnoseManagedClients();
