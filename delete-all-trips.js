import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function deleteAllTrips() {
  try {
    console.log('🚗 DELETING ALL TRIPS FROM ALL TABLES');
    console.log('═══════════════════════════════════════');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // STEP 1: Find all trip-related tables
    console.log('\n🔍 ANALYZING TRIP TABLES...');
    
    const tripTables = [
      'trips',           // Main trips table
      'trip_requests',   // Trip requests
      'bookings',        // Booking app trips
      'ride_requests',   // Alternative naming
      'scheduled_trips', // Scheduled trips
      'trip_history',    // Trip history
      'completed_trips', // Completed trips
      'cancelled_trips'  // Cancelled trips
    ];

    let totalTripsFound = 0;
    let tablesWithTrips = [];

    // Check each potential table
    for (const tableName of tripTables) {
      try {
        const { data, error, count } = await adminSupabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error && count > 0) {
          console.log(`   ✅ ${tableName}: ${count} records`);
          tablesWithTrips.push({ table: tableName, count: count });
          totalTripsFound += count;
        } else if (!error && count === 0) {
          console.log(`   📭 ${tableName}: 0 records (empty)`);
        } else {
          console.log(`   ❌ ${tableName}: doesn't exist or error`);
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: doesn't exist`);
      }
    }

    // Also check for any other tables that might contain trip data
    console.log('\n🔍 CHECKING FOR OTHER TRIP-RELATED DATA...');
    
    const otherTables = [
      'trip_payments',
      'trip_invoices', 
      'trip_feedback',
      'trip_locations',
      'trip_drivers',
      'trip_assignments',
      'facility_trips',
      'client_trips'
    ];

    for (const tableName of otherTables) {
      try {
        const { data, error, count } = await adminSupabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error && count > 0) {
          console.log(`   ✅ ${tableName}: ${count} records`);
          tablesWithTrips.push({ table: tableName, count: count });
          totalTripsFound += count;
        }
      } catch (err) {
        // Table doesn't exist, ignore
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total trip records found: ${totalTripsFound}`);
    console.log(`   Tables with trip data: ${tablesWithTrips.length}`);

    if (tablesWithTrips.length === 0) {
      console.log('✅ No trip data found - database is already clean!');
      return;
    }

    // Show what will be deleted
    console.log(`\n❌ WILL DELETE:`);
    tablesWithTrips.forEach(({ table, count }) => {
      console.log(`   • ${table}: ${count} records`);
    });

    console.log(`\n⚠️  THIS WILL PERMANENTLY DELETE ${totalTripsFound} TRIP RECORDS!`);
    console.log(`🔒 SAFETY CHECK: This is a DRY RUN - no actual deletion performed`);

    // UNCOMMENT THE FOLLOWING SECTION TO PERFORM ACTUAL DELETION
    /*
    console.log('\n🚨 STARTING ACTUAL DELETION...');
    
    let totalDeleted = 0;
    let errors = [];

    for (const { table, count } of tablesWithTrips) {
      try {
        console.log(`\n🗑️  Deleting from ${table}...`);
        
        const { error } = await adminSupabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

        if (error) {
          console.error(`   ❌ Error deleting from ${table}:`, error.message);
          errors.push({ table, error: error.message });
        } else {
          console.log(`   ✅ Deleted ${count} records from ${table}`);
          totalDeleted += count;
        }

      } catch (err) {
        console.error(`   ❌ Unexpected error with ${table}:`, err.message);
        errors.push({ table, error: err.message });
      }
    }

    console.log('\n🎉 TRIP DELETION COMPLETE!');
    console.log(`   ✅ Successfully deleted: ${totalDeleted} records`);
    console.log(`   ❌ Errors encountered: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(({ table, error }) => {
        console.log(`   ${table}: ${error}`);
      });
    }
    */

    // STEP 2: Verify remaining data
    console.log('\n🔍 VERIFYING CURRENT TRIP DATA...');
    
    let remainingTrips = 0;
    for (const { table } of tablesWithTrips) {
      try {
        const { count } = await adminSupabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (count > 0) {
          console.log(`   ${table}: ${count} records remaining`);
          remainingTrips += count;
        }
      } catch (err) {
        // Ignore errors
      }
    }

    console.log(`\n📊 TOTAL REMAINING TRIPS: ${remainingTrips}`);
    
    if (remainingTrips === 0) {
      console.log('✅ All trip data has been deleted!');
    } else {
      console.log('💡 Uncomment the deletion code to delete all trips');
    }

  } catch (error) {
    console.error('💥 Error during trip deletion:', error);
  }
}

deleteAllTrips();