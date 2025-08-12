// Script to check if the facility user management system is properly set up
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSetup() {
  console.log('🔍 Checking Facility User Management Setup...\n');

  try {
    // 1. Check if facility_users table exists
    console.log('1. Checking facility_users table...');
    const { data: facilityUsersTable, error: tableError } = await supabase
      .from('facility_users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ facility_users table not found or accessible');
      console.log('   Error:', tableError.message);
      console.log('   → Run the facility_user_management_schema.sql file first');
    } else {
      console.log('✅ facility_users table exists and accessible');
    }

    // 2. Check if facility_contracts table exists
    console.log('\n2. Checking facility_contracts table...');
    const { data: contractsTable, error: contractsError } = await supabase
      .from('facility_contracts')
      .select('*')
      .limit(1);
    
    if (contractsError) {
      console.log('❌ facility_contracts table not found or accessible');
      console.log('   Error:', contractsError.message);
    } else {
      console.log('✅ facility_contracts table exists and accessible');
    }

    // 3. Check if helper functions exist
    console.log('\n3. Checking database functions...');
    const { data: functionTest, error: functionError } = await supabase
      .rpc('check_facility_permission', { required_roles: ['super_admin'] });
    
    if (functionError) {
      console.log('❌ Helper functions not found');
      console.log('   Error:', functionError.message);
    } else {
      console.log('✅ Database helper functions are working');
    }

    // 4. Check existing facilities
    console.log('\n4. Checking existing facilities...');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(5);
    
    if (facilitiesError) {
      console.log('❌ Error accessing facilities table');
      console.log('   Error:', facilitiesError.message);
    } else {
      console.log(`✅ Found ${facilities.length} facilities`);
      facilities.forEach(f => console.log(`   - ${f.name} (${f.id})`));
    }

    // 5. Check existing facility users
    console.log('\n5. Checking existing facility users...');
    const { data: facilityUsers, error: usersError } = await supabase
      .from('facility_users')
      .select('role, status, facility_id')
      .eq('status', 'active');
    
    if (usersError) {
      console.log('❌ Error accessing facility_users');
      console.log('   Error:', usersError.message);
    } else {
      console.log(`✅ Found ${facilityUsers.length} active facility users`);
      
      // Count by role
      const roleCounts = facilityUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`   - ${role}: ${count} users`);
      });
    }

    // 6. Check if migration is needed
    console.log('\n6. Checking if migration is needed...');
    const { data: legacyUsers, error: legacyError } = await supabase
      .from('profiles')
      .select('id, facility_id, role')
      .eq('role', 'facility')
      .not('facility_id', 'is', null);
    
    if (legacyError) {
      console.log('❌ Error checking legacy users');
    } else if (legacyUsers.length > 0) {
      console.log(`⚠️  Found ${legacyUsers.length} legacy facility users that need migration`);
      console.log('   → Run the migration script: migrate_existing_facilities.sql');
    } else {
      console.log('✅ No legacy users found - migration not needed');
    }

    console.log('\n🎉 Setup check complete!');
    
  } catch (error) {
    console.error('💥 Setup check failed:', error);
  }
}

// Run the check
checkSetup()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });