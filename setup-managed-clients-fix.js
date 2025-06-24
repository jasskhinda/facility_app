#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function addTestManagedClients() {
  console.log('🔧 ADDING TEST MANAGED CLIENT DATA FOR CLIENT NAME FIX');
  console.log('====================================================');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // 1. Check current trips with managed_client_id to see what IDs we need
    console.log('\n1️⃣ Checking trips with managed_client_id...');
    
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, pickup_address')
      .not('managed_client_id', 'is', null)
      .eq('facility_id', facilityId)
      .limit(10);
    
    if (tripsError) {
      console.log('❌ Error fetching trips:', tripsError.message);
      return;
    }
    
    console.log(`✅ Found ${trips.length} trips with managed_client_id`);
    
    const managedClientIds = [...new Set(trips.map(t => t.managed_client_id))];
    console.log(`📋 Unique managed client IDs: ${managedClientIds.length}`);
    
    if (managedClientIds.length === 0) {
      console.log('⚠️ No managed client IDs found in trips');
      return;
    }
    
    // 2. Check which tables exist and which IDs are missing
    console.log('\n2️⃣ Checking existing managed client data...');
    
    let existingClients = [];
    let targetTable = null;
    
    // Try facility_managed_clients first
    try {
      const { data: fmc, error: fmcError } = await supabase
        .from('facility_managed_clients')
        .select('id, first_name, last_name, phone_number')
        .in('id', managedClientIds);
      
      if (!fmcError) {
        existingClients = fmc || [];
        targetTable = 'facility_managed_clients';
        console.log(`✅ facility_managed_clients accessible - found ${existingClients.length} existing records`);
      }
    } catch (e) {
      console.log('⚠️ facility_managed_clients not accessible');
    }
    
    // Try managed_clients if no success
    if (!targetTable) {
      try {
        const { data: mc, error: mcError } = await supabase
          .from('managed_clients')
          .select('id, first_name, last_name, phone_number')
          .in('id', managedClientIds);
        
        if (!mcError) {
          existingClients = mc || [];
          targetTable = 'managed_clients';
          console.log(`✅ managed_clients accessible - found ${existingClients.length} existing records`);
        }
      } catch (e) {
        console.log('⚠️ managed_clients not accessible');
      }
    }
    
    if (!targetTable) {
      console.log('❌ No managed client tables accessible - cannot add test data');
      console.log('💡 You may need to create the tables first. Check the documentation.');
      return;
    }
    
    // 3. Create test data for missing IDs
    const existingIds = existingClients.map(c => c.id);
    const missingIds = managedClientIds.filter(id => !existingIds.includes(id));
    
    console.log(`\n3️⃣ Creating test data for ${missingIds.length} missing client IDs...`);
    
    if (missingIds.length === 0) {
      console.log('✅ All managed client IDs already have records');
      
      // Show existing records
      existingClients.forEach((client, index) => {
        const name = `${client.first_name} ${client.last_name}`.trim();
        const phone = client.phone_number ? ` - ${client.phone_number}` : '';
        console.log(`  ${index + 1}. ${name}${phone} (${client.id.slice(0, 8)}...)`);
      });
      
      return;
    }
    
    // Generate realistic test data
    const firstNames = ['David', 'Maria', 'Robert', 'Sarah', 'Michael', 'Lisa', 'James', 'Jennifer'];
    const lastNames = ['Patel', 'Rodriguez', 'Chen', 'Johnson', 'Smith', 'Williams', 'Brown', 'Davis'];
    const phoneNumbers = ['(416) 555-2233', '(647) 555-9876', '(905) 555-4321', '(416) 555-7890', '(647) 555-1234'];
    
    const testClients = missingIds.map((id, index) => {
      const firstName = firstNames[index % firstNames.length];
      const lastName = lastNames[index % lastNames.length];
      const phone = phoneNumbers[index % phoneNumbers.length];
      
      const baseRecord = {
        id: id,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        created_at: new Date().toISOString()
      };
      
      // Add table-specific fields
      if (targetTable === 'facility_managed_clients') {
        return {
          ...baseRecord,
          facility_id: facilityId,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
        };
      } else {
        return {
          ...baseRecord,
          name: `${firstName} ${lastName}`,
          client_name: `${firstName} ${lastName}`,
          facility_id: facilityId,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
        };
      }
    });
    
    // Insert test data
    const { data: insertedClients, error: insertError } = await supabase
      .from(targetTable)
      .upsert(testClients, { onConflict: 'id' })
      .select();
    
    if (insertError) {
      console.log('❌ Error inserting test clients:', insertError.message);
      return;
    }
    
    console.log(`✅ Successfully added ${insertedClients.length} test managed clients to ${targetTable}:`);
    
    insertedClients.forEach((client, index) => {
      const name = `${client.first_name} ${client.last_name}`.trim();
      const phone = client.phone_number ? ` - ${client.phone_number}` : '';
      console.log(`  ${index + 1}. ${name}${phone} (${client.id.slice(0, 8)}...)`);
    });
    
    // 4. Test the billing API to see the improvement
    console.log('\n4️⃣ Testing billing API with new data...');
    
    try {
      const response = await fetch('http://localhost:3000/api/facility/trips-billing?limit=5');
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('✅ Billing API test successful');
        console.log(`📊 Found ${data.bills.length} bills`);
        
        // Show sample client names
        const sampleNames = data.bills.slice(0, 5).map(bill => bill.client_name);
        console.log('🏷️ Sample client names:');
        sampleNames.forEach((name, index) => {
          console.log(`  ${index + 1}. ${name}`);
        });
        
        // Check success rate
        const managedNames = sampleNames.filter(name => name.includes('(Managed)'));
        const properNames = managedNames.filter(name => name.match(/^[A-Z][a-z]+ [A-Z][a-z]+ \(Managed\)/));
        
        if (properNames.length > 0) {
          console.log(`🎉 SUCCESS: Found ${properNames.length} properly formatted managed client names!`);
        } else {
          console.log('⚠️ Still showing fallback names - check server logs for details');
        }
        
      } else {
        console.log('⚠️ Billing API not accessible - server may not be running');
      }
    } catch (e) {
      console.log('⚠️ Could not test billing API:', e.message);
    }
    
    console.log('\n🎉 TEST DATA SETUP COMPLETE!');
    console.log('💡 Restart your development server and check the billing page');
    console.log('🔗 Expected format: "David Patel (Managed) - (416) 555-2233"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addTestManagedClients();
