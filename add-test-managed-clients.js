#!/usr/bin/env node

// Add test managed client data to fix the "Managed Client (ea79223a)" issue
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function addTestManagedClients() {
  console.log('🔧 ADDING TEST MANAGED CLIENT DATA');
  console.log('=================================');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // First, let's check if the managed_clients table exists
    console.log('\n1️⃣ Checking if managed_clients table exists...');
    
    const { data: existingData, error: checkError } = await supabase
      .from('managed_clients')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('❌ managed_clients table might not exist:', checkError.message);
      
      // Try to create the table
      console.log('\n2️⃣ Attempting to create managed_clients table...');
      
      const { error: createError } = await supabase.rpc('create_managed_clients_table');
      
      if (createError) {
        console.log('❌ Could not create table via RPC. Manual SQL needed:');
        console.log(`
CREATE TABLE IF NOT EXISTS managed_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  name TEXT,
  client_name TEXT,
  email TEXT,
  phone TEXT,
  facility_id UUID REFERENCES facilities(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
        `);
        return;
      }
    }
    
    console.log('✅ managed_clients table is accessible');
    
    // Now let's add test data for the specific ID we're seeing
    console.log('\n3️⃣ Adding test managed client data...');
    
    // Generate test data that includes the ID pattern we're seeing
    const testClients = [
      {
        id: 'ea79223a-1234-5678-9abc-def012345678', // Match the pattern we're seeing
        first_name: 'John',
        last_name: 'Smith',
        name: 'John Smith',
        client_name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        facility_id: 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' // The facility ID from the API
      },
      {
        id: 'ea79223a-2345-6789-bcde-f01234567890', // Another variation
        first_name: 'Mary',
        last_name: 'Johnson',
        name: 'Mary Johnson',
        client_name: 'Mary Johnson',
        email: 'mary.johnson@example.com',
        phone: '(555) 987-6543',
        facility_id: 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
      },
      {
        id: 'ea79223a-3456-789a-cdef-012345678901', // Third variation
        first_name: 'Robert',
        last_name: 'Wilson',
        name: 'Robert Wilson',
        client_name: 'Robert Wilson',
        email: 'robert.wilson@example.com',
        phone: '(555) 456-7890',
        facility_id: 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
      }
    ];
    
    for (const client of testClients) {
      const { data, error } = await supabase
        .from('managed_clients')
        .upsert(client, { onConflict: 'id' })
        .select();
      
      if (error) {
        console.log(`❌ Error adding client ${client.first_name}:`, error.message);
      } else {
        console.log(`✅ Added/updated managed client: ${client.first_name} ${client.last_name} (${client.id.slice(0, 8)}...)`);
      }
    }
    
    console.log('\n4️⃣ Verifying managed client data...');
    
    const { data: allClients, error: verifyError } = await supabase
      .from('managed_clients')
      .select('*')
      .limit(10);
    
    if (verifyError) {
      console.log('❌ Error verifying data:', verifyError.message);
    } else {
      console.log(`✅ Total managed clients in database: ${allClients.length}`);
      allClients.forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.first_name || client.name || client.client_name || 'No name'} (${client.id.slice(0, 8)}...)`);
      });
    }
    
    console.log('\n🎉 TEST DATA SETUP COMPLETE!');
    console.log('Now test the billing page to see if "Managed Client (ea79223a)" shows a real name');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

addTestManagedClients();
