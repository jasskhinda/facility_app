// Quick script to run the database migration
// This connects to your Supabase database and runs the migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need this for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard > Settings > API)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    
    // Read the migration script
    const migrationScript = fs.readFileSync(
      path.join(process.cwd(), 'db', 'temp_clients_fix.sql'), 
      'utf8'
    );
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationScript
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('🎉 The facility_id column has been added to your database.');
    console.log('📍 You can now access the facility settings page without errors.');
    
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
  }
}

runMigration();
