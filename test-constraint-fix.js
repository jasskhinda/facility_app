#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testConstraint() {
  console.log('🧪 Testing user_id constraint for managed clients...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test inserting a trip with NULL user_id (like managed clients do)
    const testData = {
      user_id: null,
      managed_client_id: '12345678-1234-1234-1234-123456789012',
      pickup_address: 'Test Pickup Address',
      destination_address: 'Test Destination Address',
      pickup_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      status: 'pending',
      wheelchair_type: 'no_wheelchair',
      is_round_trip: false
    };
    
    console.log('📝 Attempting to insert trip with NULL user_id (managed client scenario)...');
    
    const { data, error } = await supabase
      .from('trips')
      .insert(testData)
      .select()
      .single();
      
    if (error) {
      if (error.message.includes('null value') && error.message.includes('user_id')) {
        console.log('❌ CONSTRAINT ISSUE CONFIRMED!');
        console.log('🔧 The user_id column still has NOT NULL constraint');
        console.log('📋 You need to run this SQL in Supabase Dashboard:');
        console.log('');
        console.log('   ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;');
        console.log('');
        console.log('🎯 This will fix the managed client booking issue');
      } else {
        console.log('⚠️ Different error occurred:', error.message);
        if (error.message.includes('managed_client_id')) {
          console.log('💡 The managed_client_id column might not exist yet');
        }
      }
    } else {
      console.log('✅ SUCCESS! Managed client trip created successfully');
      console.log('🎉 user_id constraint is already fixed!');
      console.log('📋 Trip ID:', data.id);
      
      // Clean up test record
      console.log('🧹 Cleaning up test record...');
      await supabase.from('trips').delete().eq('id', data.id);
      console.log('✅ Test record cleaned up');
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err.message);
  }
}

// Test also with authenticated client scenario
async function testAuthenticatedClient() {
  console.log('\n🧪 Testing authenticated client scenario...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const testData = {
      user_id: '12345678-1234-1234-1234-123456789012',
      managed_client_id: null,
      pickup_address: 'Test Pickup Address',
      destination_address: 'Test Destination Address', 
      pickup_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'pending',
      wheelchair_type: 'no_wheelchair',
      is_round_trip: false
    };
    
    const { data, error } = await supabase
      .from('trips')
      .insert(testData)
      .select()
      .single();
      
    if (error) {
      console.log('⚠️ Authenticated client test failed:', error.message);
    } else {
      console.log('✅ Authenticated client trip works correctly');
      
      // Clean up
      await supabase.from('trips').delete().eq('id', data.id);
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (err) {
    console.error('💥 Error in authenticated test:', err.message);
  }
}

async function runTests() {
  await testConstraint();
  await testAuthenticatedClient();
  
  console.log('\n📋 SUMMARY:');
  console.log('- If managed client test failed with null constraint error, run the SQL fix');
  console.log('- If both tests pass, the constraint is already fixed');
  console.log('- After fixing, both authenticated and managed clients should work');
}

runTests().catch(console.error);
