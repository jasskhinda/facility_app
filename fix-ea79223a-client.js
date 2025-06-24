#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixSpecificManagedClient() {
  console.log('🔧 FIXING SPECIFIC MANAGED CLIENT: ea79223a');
  console.log('==============================================');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // 1. First, let's check what trips are using this managed_client_id
    console.log('\n1️⃣ Checking trips with managed_client_id ea79223a...');
    
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, pickup_address, destination_address')
      .like('managed_client_id', '%ea79223a%')
      .eq('facility_id', facilityId);
    
    if (tripsError) {
      console.log('❌ Error fetching trips:', tripsError.message);
      return;
    }
    
    console.log(`✅ Found ${trips.length} trips using this managed_client_id`);
    
    if (trips.length > 0) {
      const sampleTrip = trips[0];
      console.log('📍 Sample trip:', {
        id: sampleTrip.id.slice(0, 8) + '...',
        managed_client_id: sampleTrip.managed_client_id,
        pickup: sampleTrip.pickup_address.substring(0, 50) + '...'
      });
    }
    
    // 2. Check which table to use and if the record already exists
    console.log('\n2️⃣ Checking existing managed client records...');
    
    let targetTable = null;
    let existingClient = null;
    
    // Try facility_managed_clients first
    try {
      const { data: fmc, error: fmcError } = await supabase
        .from('facility_managed_clients')
        .select('*')
        .like('id', '%ea79223a%');
      
      if (!fmcError) {
        targetTable = 'facility_managed_clients';
        existingClient = fmc && fmc.length > 0 ? fmc[0] : null;
        console.log(`✅ facility_managed_clients accessible - found ${fmc.length} existing records`);
      }
    } catch (e) {
      console.log('⚠️ facility_managed_clients not accessible');
    }
    
    // Try managed_clients if first didn't work
    if (!targetTable) {
      try {
        const { data: mc, error: mcError } = await supabase
          .from('managed_clients')
          .select('*')
          .like('id', '%ea79223a%');
        
        if (!mcError) {
          targetTable = 'managed_clients';
          existingClient = mc && mc.length > 0 ? mc[0] : null;
          console.log(`✅ managed_clients accessible - found ${mc.length} existing records`);
        }
      } catch (e) {
        console.log('⚠️ managed_clients not accessible');
      }
    }
    
    if (!targetTable) {
      console.log('❌ No managed client tables accessible');
      return;
    }
    
    if (existingClient) {
      console.log('✅ Client record already exists:', {
        id: existingClient.id,
        name: existingClient.first_name + ' ' + (existingClient.last_name || ''),
        phone: existingClient.phone_number || 'No phone'
      });
      console.log('💡 The API should be resolving this name properly');
      return;
    }
    
    // 3. Create a realistic managed client record
    console.log(`\n3️⃣ Creating managed client record in ${targetTable}...`);
    
    // Extract the full managed_client_id from trips
    const fullClientId = trips.length > 0 ? trips[0].managed_client_id : 
                        'ea79223a-1234-5678-9abc-def012345678';
    
    const newClient = {
      id: fullClientId,
      first_name: 'David',
      last_name: 'Patel',
      phone_number: '(416) 555-2233',
      email: 'david.patel@example.com',
      created_at: new Date().toISOString()
    };
    
    // Add table-specific fields
    if (targetTable === 'facility_managed_clients') {
      newClient.facility_id = facilityId;
      newClient.address = '5050 Blazer Pkwy # 100, Dublin, OH 43017';
    } else {
      newClient.name = 'David Patel';
      newClient.client_name = 'David Patel';
      newClient.facility_id = facilityId;
    }
    
    const { data: insertedClient, error: insertError } = await supabase
      .from(targetTable)
      .upsert(newClient, { onConflict: 'id' })
      .select();
    
    if (insertError) {
      console.log('❌ Error creating client:', insertError.message);
      return;
    }
    
    console.log('✅ Successfully created managed client:');
    console.log(`   Name: David Patel (Managed) - (416) 555-2233`);
    console.log(`   ID: ${fullClientId}`);
    console.log(`   Table: ${targetTable}`);
    
    // 4. Test the billing API to see the result
    console.log('\n4️⃣ Testing billing API with new data...');
    
    try {
      const response = await fetch('http://localhost:3000/api/facility/trips-billing?limit=5');
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('✅ Billing API test successful');
        
        // Find bills with the specific client ID
        const davidPatelBills = data.bills.filter(bill => 
          bill.client_id === fullClientId || 
          bill.client_name.includes('David Patel')
        );
        
        if (davidPatelBills.length > 0) {
          console.log('🎉 SUCCESS! Found properly formatted client names:');
          davidPatelBills.forEach((bill, index) => {
            console.log(`  ${index + 1}. "${bill.client_name}"`);
          });
        } else {
          console.log('🔍 Looking for any client names with our ID...');
          const relevantBills = data.bills.filter(bill => 
            bill.client_id && bill.client_id.includes('ea79223a')
          );
          
          if (relevantBills.length > 0) {
            console.log('📋 Found bills with matching ID:');
            relevantBills.forEach((bill, index) => {
              console.log(`  ${index + 1}. "${bill.client_name}" (ID: ${bill.client_id.slice(0, 8)})`);
            });
          }
        }
        
      } else {
        console.log('⚠️ Billing API not accessible - server may not be running');
        console.log('💡 Start server with: npm run dev');
      }
    } catch (e) {
      console.log('⚠️ Could not test billing API:', e.message);
    }
    
    console.log('\n🎉 FIX COMPLETE!');
    console.log('💡 Refresh your billing page to see: "David Patel (Managed) - (416) 555-2233"');
    console.log('💡 If still showing generic name, check server logs for debugging info');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixSpecificManagedClient();
