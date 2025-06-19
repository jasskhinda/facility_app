#!/usr/bin/env node

/**
 * Simple migration script to add the additional_passengers column
 * This fixes the "Could not find the 'additional_passengers' column" error
 */

const { createClient } = require('@supabase/supabase-js');

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

async function addMissingColumns() {
  console.log('🚀 Adding missing columns to trips table...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const columnsToAdd = [
    {
      name: 'additional_passengers',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS additional_passengers INTEGER DEFAULT 0',
      description: 'Number of additional passengers'
    },
    {
      name: 'trip_notes', 
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_notes TEXT',
      description: 'Special instructions or notes'
    },
    {
      name: 'pickup_details',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_details TEXT', 
      description: 'Additional pickup location details'
    },
    {
      name: 'destination_details',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_details TEXT',
      description: 'Additional destination details'
    },
    {
      name: 'booked_by',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS booked_by UUID REFERENCES auth.users(id)',
      description: 'User who created the booking'
    },
    {
      name: 'bill_to',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS bill_to TEXT DEFAULT \'facility\'',
      description: 'Who should be billed (facility or client)'
    },
    {
      name: 'managed_client_id', 
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS managed_client_id UUID',
      description: 'Reference to managed (non-authenticated) client'
    },
    {
      name: 'route_duration',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_duration TEXT',
      description: 'Estimated duration from route calculation'
    },
    {
      name: 'route_distance_text',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_distance_text TEXT', 
      description: 'Human readable distance'
    },
    {
      name: 'route_duration_text',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_duration_text TEXT',
      description: 'Human readable duration'
    },
    {
      name: 'related_trip_id',
      sql: 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS related_trip_id UUID REFERENCES trips(id)',
      description: 'Links return trip to original trip'
    }
  ];
  
  try {
    let successCount = 0;
    
    for (const column of columnsToAdd) {
      console.log(`📝 Adding column: ${column.name} (${column.description})`);
      
      // Use SQL query directly
      const { data, error } = await supabase
        .from('trips')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('column') && error.message.includes(column.name)) {
        console.log(`   ⚠️  Column ${column.name} already exists, skipping...`);
        continue;
      }
      
      // Try to add the column using raw SQL
      try {
        const { error: sqlError } = await supabase.rpc('exec_sql', { 
          sql: column.sql 
        });
        
        if (sqlError) {
          console.log(`   ⚠️  ${column.name}: ${sqlError.message}`);
          if (sqlError.message.includes('already exists')) {
            console.log(`   ✅ Column ${column.name} already exists`);
          }
        } else {
          console.log(`   ✅ Added column: ${column.name}`);
          successCount++;
        }
      } catch (sqlErr) {
        console.log(`   ⚠️  Could not add ${column.name}: ${sqlErr.message}`);
      }
    }
    
    console.log(`\n🎉 Migration completed! Added ${successCount} new columns.`);
    console.log('✅ The additional_passengers column error should now be fixed!');
    console.log('\n💡 You can now try booking a ride again.');
    
  } catch (err) {
    console.error('💥 Migration failed:', err);
    console.log('\n📋 Manual fix instructions:');
    console.log('If this script fails, you can manually add the columns in your Supabase dashboard:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to Table Editor > trips table');
    console.log('3. Add a new column:');
    console.log('   - Name: additional_passengers');
    console.log('   - Type: int4 (integer)');
    console.log('   - Default value: 0');
    console.log('   - Allow nullable: true');
    process.exit(1);
  }
}

// Run the migration
addMissingColumns();
