#!/usr/bin/env node

/**
 * Migration script to fix the user_id NOT NULL constraint issue
 * This allows managed clients to have trips with NULL user_id
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env.local file');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting user_id constraint fix migration...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'db', 'fix_user_id_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Reading migration file:', migrationPath);
    
    // Execute the migration using rpc to exec_sql
    console.log('⚡ Executing migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📝 Changes made:');
    console.log('   - Removed NOT NULL constraint from user_id column');
    console.log('   - Ensured managed_client_id column exists');
    console.log('   - Added constraint ensuring proper client reference');
    console.log('');
    console.log('🎉 Facility App booking should now work for both:');
    console.log('   ✅ Authenticated clients (with user_id)');
    console.log('   ✅ Managed clients (with managed_client_id and NULL user_id)');
    console.log('');
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
