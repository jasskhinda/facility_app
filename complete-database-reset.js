import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function completeReset() {
  try {
    console.log('🚨 COMPLETE DATABASE RESET - KEEPING ONLY ADMIN & DISPATCHER ACCOUNTS');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // STEP 1: Analyze what we have
    console.log('\n📊 ANALYZING CURRENT DATABASE STATE...');
    
    const { data: allProfiles } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, facility_id');

    const adminUsers = allProfiles?.filter(p => p.role === 'admin') || [];
    const dispatcherUsers = allProfiles?.filter(p => p.role === 'dispatcher') || [];
    const facilityUsers = allProfiles?.filter(p => p.role === 'facility') || [];
    const clientUsers = allProfiles?.filter(p => p.role === 'client') || [];
    const driverUsers = allProfiles?.filter(p => p.role === 'driver') || [];
    const otherUsers = allProfiles?.filter(p => !['admin', 'dispatcher', 'facility', 'client', 'driver'].includes(p.role)) || [];

    console.log(`\n👥 CURRENT USER BREAKDOWN:`);
    console.log(`   ✅ Admin Users: ${adminUsers.length} (KEEP)`);
    console.log(`   ✅ Dispatcher Users: ${dispatcherUsers.length} (KEEP)`);
    console.log(`   ❌ Facility Users: ${facilityUsers.length} (DELETE)`);
    console.log(`   ❌ Client Users: ${clientUsers.length} (DELETE)`);
    console.log(`   ❌ Driver Users: ${driverUsers.length} (DELETE)`);
    console.log(`   ❌ Other Users: ${otherUsers.length} (DELETE)`);

    // Count trips
    const { data: allTrips } = await adminSupabase.from('trips').select('id, status, user_id, facility_id');
    console.log(`   ❌ Total Trips: ${allTrips?.length || 0} (DELETE ALL)`);

    // Count facilities
    const { data: allFacilities } = await adminSupabase.from('facilities').select('id, name');
    console.log(`   ❌ Total Facilities: ${allFacilities?.length || 0} (DELETE ALL)`);

    // Count facility users
    const { data: facilityUserEntries } = await adminSupabase.from('facility_users').select('id');
    console.log(`   ❌ Facility User Entries: ${facilityUserEntries?.length || 0} (DELETE ALL)`);

    // Users to delete
    const usersToDelete = [...facilityUsers, ...clientUsers, ...driverUsers, ...otherUsers];
    
    console.log(`\n🎯 DELETION SUMMARY:`);
    console.log(`   KEEP: ${adminUsers.length + dispatcherUsers.length} users (admin + dispatcher)`);
    console.log(`   DELETE: ${usersToDelete.length} users + ${allTrips?.length || 0} trips + ${allFacilities?.length || 0} facilities`);

    // Show what we're keeping
    console.log(`\n✅ ACCOUNTS TO KEEP:`);
    [...adminUsers, ...dispatcherUsers].forEach(user => {
      console.log(`   ${user.role.toUpperCase()}: ${user.first_name} ${user.last_name} (${user.email})`);
    });

    // Show sample of what we're deleting
    console.log(`\n❌ SAMPLE OF ACCOUNTS TO DELETE:`);
    usersToDelete.slice(0, 10).forEach(user => {
      console.log(`   ${user.role.toUpperCase()}: ${user.first_name} ${user.last_name} (${user.email})`);
    });
    if (usersToDelete.length > 10) {
      console.log(`   ... and ${usersToDelete.length - 10} more users`);
    }

    console.log(`\n⚠️  THIS WILL PERMANENTLY DELETE:`);
    console.log(`   • ${usersToDelete.length} user accounts`);
    console.log(`   • ${allTrips?.length || 0} trips`);
    console.log(`   • ${allFacilities?.length || 0} facilities`);
    console.log(`   • ${facilityUserEntries?.length || 0} facility user relationships`);
    console.log(`   • All managed clients`);
    console.log(`   • All facility contracts`);
    console.log(`   • All related data`);

    console.log(`\n🔒 SAFETY CHECK: This is a DRY RUN - no actual deletion performed`);
    console.log(`\nTo perform the actual deletion, uncomment the deletion code below.`);

    // UNCOMMENT THE FOLLOWING SECTION TO PERFORM ACTUAL DELETION
    /*
    console.log('\n🚨 STARTING ACTUAL DELETION...');
    
    let deletedCount = 0;
    let errorCount = 0;

    // STEP 2: Delete all trips first (to avoid foreign key issues)
    console.log('\n🗑️  DELETING ALL TRIPS...');
    const { error: tripsError } = await adminSupabase
      .from('trips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all trips

    if (tripsError) {
      console.error('❌ Error deleting trips:', tripsError);
      errorCount++;
    } else {
      console.log(`✅ Deleted ${allTrips?.length || 0} trips`);
    }

    // STEP 3: Delete facility-related data
    console.log('\n🗑️  DELETING FACILITY DATA...');
    
    // Delete facility_users entries
    const { error: facilityUsersError } = await adminSupabase
      .from('facility_users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (facilityUsersError) {
      console.error('❌ Error deleting facility_users:', facilityUsersError);
    } else {
      console.log(`✅ Deleted facility_users entries`);
    }

    // Delete facility_contracts
    const { error: contractsError } = await adminSupabase
      .from('facility_contracts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (contractsError) {
      console.error('❌ Error deleting facility_contracts:', contractsError);
    } else {
      console.log(`✅ Deleted facility contracts`);
    }

    // Delete managed clients
    const { error: managedClientsError } = await adminSupabase
      .from('facility_managed_clients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (managedClientsError) {
      console.error('❌ Error deleting managed clients:', managedClientsError);
    } else {
      console.log(`✅ Deleted managed clients`);
    }

    // STEP 4: Delete user accounts (profiles first, then auth)
    console.log('\n🗑️  DELETING USER ACCOUNTS...');
    
    for (const user of usersToDelete) {
      try {
        console.log(`   Deleting: ${user.first_name} ${user.last_name} (${user.email})`);
        
        // Delete profile
        const { error: profileError } = await adminSupabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        if (profileError) {
          console.error(`   ❌ Profile deletion failed: ${profileError.message}`);
          errorCount++;
          continue;
        }

        // Delete from auth
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(user.id);

        if (authError) {
          console.error(`   ❌ Auth deletion failed: ${authError.message}`);
          errorCount++;
        } else {
          deletedCount++;
          console.log(`   ✅ Deleted successfully`);
        }

      } catch (error) {
        console.error(`   ❌ Unexpected error: ${error.message}`);
        errorCount++;
      }
    }

    // STEP 5: Delete facilities last
    console.log('\n🗑️  DELETING FACILITIES...');
    const { error: facilitiesError } = await adminSupabase
      .from('facilities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (facilitiesError) {
      console.error('❌ Error deleting facilities:', facilitiesError);
    } else {
      console.log(`✅ Deleted ${allFacilities?.length || 0} facilities`);
    }

    console.log('\n🎉 DELETION COMPLETE!');
    console.log(`   ✅ Successfully deleted: ${deletedCount} users`);
    console.log(`   ❌ Errors encountered: ${errorCount}`);
    console.log(`   ✅ Trips deleted: ${allTrips?.length || 0}`);
    console.log(`   ✅ Facilities deleted: ${allFacilities?.length || 0}`);
    */

    // STEP 6: Verify what remains
    console.log('\n🔍 VERIFYING REMAINING DATA...');
    
    const { data: remainingProfiles } = await adminSupabase
      .from('profiles')
      .select('role')
      .in('role', ['admin', 'dispatcher']);

    const { data: remainingTrips } = await adminSupabase.from('trips').select('id', { count: 'exact' });
    const { data: remainingFacilities } = await adminSupabase.from('facilities').select('id', { count: 'exact' });

    console.log(`\n📊 REMAINING DATA:`);
    console.log(`   👥 Admin/Dispatcher Users: ${remainingProfiles?.length || 0}`);
    console.log(`   🚗 Trips: ${remainingTrips?.count || 0}`);
    console.log(`   🏥 Facilities: ${remainingFacilities?.count || 0}`);

    console.log('\n✅ DATABASE RESET ANALYSIS COMPLETE');
    console.log('💡 Uncomment the deletion code to perform actual reset');

  } catch (error) {
    console.error('💥 Error during reset:', error);
  }
}

completeReset();