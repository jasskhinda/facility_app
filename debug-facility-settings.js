require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function debugFacilitySettings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('=== Debugging Facility Settings Error ===\n');

  try {
    // Check facility_users table
    console.log('1. Checking facility_users table...');
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('facility_users')
      .select('*');
    
    if (facilityUsersError) {
      console.log('❌ Error querying facility_users:', facilityUsersError.message);
    } else {
      console.log(`✅ Found ${facilityUsers.length} facility users`);
      facilityUsers.forEach(user => {
        console.log(`  - User ID: ${user.user_id}, Facility ID: ${user.facility_id}, Role: ${user.role}, Status: ${user.status}`);
      });
    }

    // Check profiles table for facility users
    console.log('\n2. Checking profiles table for facility users...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'facility');
    
    if (profilesError) {
      console.log('❌ Error querying profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles.length} facility profiles`);
      profiles.forEach(profile => {
        console.log(`  - User ID: ${profile.id}, Email: ${profile.email}, Facility ID: ${profile.facility_id}`);
      });
    }

    // Check facilities table
    console.log('\n3. Checking facilities table...');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*');
    
    if (facilitiesError) {
      console.log('❌ Error querying facilities:', facilitiesError.message);
    } else {
      console.log(`✅ Found ${facilities.length} facilities`);
      facilities.forEach(facility => {
        console.log(`  - Facility ID: ${facility.id}, Name: ${facility.name}`);
      });
    }

    // Test specific queries that might be failing
    console.log('\n4. Testing problematic queries...');
    
    // Test facility_users query with active status
    const { data: activeFacilityUsers, error: activeFacilityUsersError } = await supabase
      .from('facility_users')
      .select('role, facility_id')
      .eq('status', 'active');
    
    if (activeFacilityUsersError) {
      console.log('❌ Error with active facility_users query:', activeFacilityUsersError.message);
    } else {
      console.log(`✅ Found ${activeFacilityUsers.length} active facility users`);
    }

    // Check for duplicate facility_users
    console.log('\n5. Checking for duplicate facility_users...');
    const userCounts = {};
    facilityUsers.forEach(user => {
      const key = `${user.user_id}-${user.facility_id}`;
      userCounts[key] = (userCounts[key] || 0) + 1;
    });
    
    const duplicates = Object.entries(userCounts).filter(([key, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('❌ Found duplicate facility_users:');
      duplicates.forEach(([key, count]) => {
        console.log(`  - ${key}: ${count} entries`);
      });
    } else {
      console.log('✅ No duplicate facility_users found');
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugFacilitySettings();