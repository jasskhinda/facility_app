#!/usr/bin/env node

/**
 * Simple migration to fix user_id constraint
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkAndFix() {
  console.log('🔍 Checking user_id constraint...');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Check current constraint
    console.log('📊 Checking trips table schema...');
    
    // Try to insert a test record with null user_id to see if constraint exists
    const testData = {
      managed_client_id: '00000000-0000-0000-0000-000000000000',
      user_id: null,
      pickup_address: 'Test Address',
      destination_address: 'Test Destination',
      pickup_time: new Date().toISOString(),
      status: 'pending'
    };
    
    console.log('🧪 Testing NULL user_id constraint...');
    const { data, error } = await supabase
      .from('trips')
      .insert(testData)
      .select()
      .single();
      
    if (error) {
      if (error.message.includes('null value') && error.message.includes('user_id')) {
        console.log('⚠️ CONFIRMED: NOT NULL constraint exists on user_id');
        console.log('🔧 Need to remove constraint...');
        
        // Try to fix with direct SQL
        const fixSQL = 'ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;';
        const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixSQL });
        
        if (fixError) {
          console.error('❌ Failed to fix constraint:', fixError.message);
        } else {
          console.log('✅ Successfully removed NOT NULL constraint!');
        }
      } else {
        console.log('ℹ️ Different error:', error.message);
      }
    } else {
      console.log('✅ NULL user_id accepted - constraint is already fixed!');
      // Clean up test record
      await supabase.from('trips').delete().eq('id', data.id);
    }
    
  } catch (err) {
    console.error('💥 Error:', err.message);
  }
}

checkAndFix();
