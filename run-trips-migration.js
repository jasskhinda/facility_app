#!/usr/bin/env node

/**
 * Migration script to add missing columns to the trips table
 * Run this script to fix the "additional_passengers column not found" error
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
  console.log('🚀 Starting trips table migration...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'db', 'add_missing_trip_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Reading migration file:', migrationPath);
    
    // Execute the migration
    console.log('⚡ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📝 Added columns to trips table:');
    console.log('   - additional_passengers (INTEGER)');
    console.log('   - trip_notes (TEXT)');
    console.log('   - pickup_details (TEXT)');
    console.log('   - destination_details (TEXT)');
    console.log('   - booked_by (UUID)');
    console.log('   - bill_to (TEXT)');
    console.log('   - managed_client_id (UUID)');
    console.log('   - route_duration (TEXT)');
    console.log('   - route_distance_text (TEXT)');
    console.log('   - route_duration_text (TEXT)');
    console.log('   - related_trip_id (UUID)');
    console.log('');
    console.log('🎉 Your booking form should now work without the column error!');
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runMigrationDirect() {
  console.log('🚀 Starting trips table migration (direct method)...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'db', 'add_missing_trip_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Reading migration file:', migrationPath);
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split('END $$;')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ' END $$;');
    
    console.log(`⚡ Executing ${statements.length} migration statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: Executing statement...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error);
          process.exit(1);
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('🎉 Your booking form should now work without the column error!');
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Failed to run migration:', err);
  console.log('\n🔄 Trying alternative method...');
  runMigrationDirect().catch(altErr => {
    console.error('Alternative method also failed:', altErr);
    process.exit(1);
  });
});
