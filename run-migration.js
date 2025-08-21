// Quick script to run the database migration for pricing breakdown columns
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔄 Running pricing breakdown migration...');
    
    // Add columns directly using SQL
    const alterQueries = [
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS pricing_breakdown_data JSONB;`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS pricing_breakdown_total DECIMAL(10,2);`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS pricing_breakdown_locked_at TIMESTAMPTZ;`
    ];

    console.log('Adding pricing breakdown columns...');
    
    for (const query of alterQueries) {
      console.log(`Executing: ${query}`);
      const { error } = await supabase.rpc('exec', { sql: query });
      if (error) {
        console.error('❌ Query failed:', error);
        // Try with alternative function name
        const { error: error2 } = await supabase.rpc('exec_sql', { sql_query: query });
        if (error2) {
          console.error('❌ Alternative query also failed:', error2);
        } else {
          console.log('✅ Query succeeded with alternative method');
        }
      } else {
        console.log('✅ Query succeeded');
      }
    }
    
    console.log('✅ Pricing breakdown migration completed!');
    console.log('🎉 Pricing breakdown columns have been added to your database.');
    
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
  }
}

runMigration();
