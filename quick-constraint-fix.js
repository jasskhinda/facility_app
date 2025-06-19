#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function fixConstraint() {
  console.log('🔧 Fixing user_id constraint for managed clients...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Remove NOT NULL constraint from user_id
    console.log('📝 Removing NOT NULL constraint from user_id...');
    
    const { error: sqlError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;'
    });
    
    if (sqlError) {
      console.log(`⚠️ SQL Error: ${sqlError.message}`);
      if (sqlError.message.includes('does not exist') || sqlError.message.includes('already')) {
        console.log('✅ Constraint may already be removed');
      }
    } else {
      console.log('✅ Successfully removed NOT NULL constraint from user_id');
    }
    
    // Ensure managed_client_id column exists
    console.log('📝 Ensuring managed_client_id column exists...');
    
    const { error: columnError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS managed_client_id UUID;'
    });
    
    if (columnError) {
      console.log(`⚠️ Column Error: ${columnError.message}`);
    } else {
      console.log('✅ managed_client_id column is available');
    }
    
    // Test the fix
    console.log('🧪 Testing constraint fix...');
    const testId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error: testError } = await supabase
      .from('trips')
      .insert({
        user_id: null,
        managed_client_id: testId,
        pickup_address: 'Test Address',
        destination_address: 'Test Destination',
        pickup_time: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();
      
    if (testError) {
      if (testError.message.includes('null value') && testError.message.includes('user_id')) {
        console.log('❌ CONSTRAINT STILL EXISTS!');
        console.log('🔧 Manual fix required in Supabase Dashboard:');
        console.log('   ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;');
      } else {
        console.log('⚠️ Different error:', testError.message);
      }
    } else {
      console.log('✅ SUCCESS! NULL user_id accepted - constraint is fixed!');
      
      // Clean up test record
      await supabase.from('trips').delete().eq('id', data.id);
      console.log('🧹 Cleaned up test record');
      
      console.log('\n🎉 CONSTRAINT FIX COMPLETE!');
      console.log('✅ Managed clients can now book trips');
      console.log('✅ Facility App should work without user_id errors');
    }
    
  } catch (err) {
    console.error('💥 Error:', err.message);
  }
}

fixConstraint().catch(console.error);
