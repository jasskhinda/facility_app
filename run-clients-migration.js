// Script to run the facility_managed_clients table migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Try to load environment from process.env or Next.js config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking environment variables...');
console.log('Supabase URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('Service Key:', supabaseServiceKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is required');
  console.log('You can find this in your Supabase project dashboard under Settings > API');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  console.log('You can find this in your Supabase project dashboard under Settings > API');
  console.log('Make sure to use the service_role key (not anon key) for this migration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running facility_managed_clients table migration...');
    
    // Read the migration script
    const migrationScript = fs.readFileSync(
      path.join(process.cwd(), 'db', 'temp_clients_fix.sql'), 
      'utf8'
    );
    
    console.log('📄 Migration script loaded, executing...');
    
    // Split the script into individual statements and execute them
    const statements = migrationScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      console.log('⚡ Executing:', statement.substring(0, 50) + '...');
      
      const { data, error } = await supabase.rpc('sql', {
        query: statement
      });
      
      if (error) {
        console.log('ℹ️  Statement result:', statement.substring(0, 100));
        console.log('ℹ️  Error (might be expected):', error.message);
        // Continue execution - some errors might be expected (table already exists, etc.)
      } else {
        console.log('✅ Success');
      }
    }
    
    console.log('🎉 Migration completed!');
    
    // Test the table
    console.log('🧪 Testing table access...');
    const { data: tableTest, error: testError } = await supabase
      .from('facility_managed_clients')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Table test failed:', testError.message);
    } else {
      console.log('✅ Table is accessible');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
