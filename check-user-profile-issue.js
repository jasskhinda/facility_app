#!/usr/bin/env node

/**
 * Check Current User Profile and Facility Assignment
 * This will help identify why the billing component isn't getting the right facilityId
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserProfileIssue() {
  console.log('👤 CHECKING USER PROFILE & FACILITY ASSIGNMENT');
  console.log('==============================================');

  try {
    // 1. Check all users in the system
    console.log('\n1️⃣ Checking all users in the system...');
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, facility_id')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    console.log(`✅ Found ${allUsers?.length || 0} total users:`);
    allUsers?.forEach((user, index) => {
      if (index < 10) { // Show first 10 users
        console.log(`   ${index + 1}. ${user.first_name || 'No'} ${user.last_name || 'Name'} (${user.email || 'no-email'})`);
        console.log(`      Role: ${user.role || 'none'} | Facility ID: ${user.facility_id || 'none'}`);
        console.log(`      User ID: ${user.id}`);
      }
    });

    // 2. Check facility users specifically
    console.log('\n2️⃣ Checking facility role users...');
    const facilityUsers = allUsers?.filter(user => user.role === 'facility') || [];
    
    console.log(`✅ Found ${facilityUsers.length} users with 'facility' role:`);
    facilityUsers.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`     Facility ID: ${user.facility_id || 'MISSING!'}`);
      console.log(`     User ID: ${user.id}`);
    });

    if (facilityUsers.length === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED: No users with "facility" role found!');
      console.log('💡 This is why the billing page can\'t find any data.');
      
      // 3. Let's create a facility user
      console.log('\n3️⃣ Creating a test facility user...');
      
      // First check if there are facilities
      const { data: facilities, error: facilityError } = await supabase
        .from('facilities')
        .select('id, name')
        .limit(5);

      if (facilityError) {
        console.error('❌ Error fetching facilities:', facilityError.message);
        return;
      }

      console.log(`✅ Found ${facilities?.length || 0} facilities:`);
      facilities?.forEach(facility => {
        console.log(`   - ${facility.name} (ID: ${facility.id})`);
      });

      if (facilities?.length > 0) {
        // Create a facility user
        const facilityId = facilities[0].id;
        
        console.log(`\n🏗️ Creating facility user for facility: ${facilities[0].name}`);
        
        const { data: newUser, error: createError } = await supabase
          .from('profiles')
          .insert({
            first_name: 'Test',
            last_name: 'Facility',
            email: 'test.facility@compassionatecare.com',
            role: 'facility',
            facility_id: facilityId,
            status: 'active'
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating facility user:', createError.message);
          
          // Maybe the user exists, let's try to update an existing user
          console.log('\n🔄 Trying to update an existing user to facility role...');
          
          const existingUser = allUsers?.find(user => !user.role || user.role === 'client');
          if (existingUser) {
            console.log(`📝 Updating user: ${existingUser.email} to facility role`);
            
            const { data: updatedUser, error: updateError } = await supabase
              .from('profiles')
              .update({
                role: 'facility',
                facility_id: facilityId
              })
              .eq('id', existingUser.id)
              .select()
              .single();

            if (updateError) {
              console.error('❌ Error updating user:', updateError.message);
            } else {
              console.log('✅ Successfully updated user to facility role!');
              console.log(`   User: ${updatedUser.first_name} ${updatedUser.last_name}`);
              console.log(`   Email: ${updatedUser.email}`);
              console.log(`   Facility ID: ${updatedUser.facility_id}`);
            }
          }
        } else {
          console.log('✅ Successfully created facility user!');
          console.log(`   User: ${newUser.first_name} ${newUser.last_name}`);
          console.log(`   Email: ${newUser.email}`);
          console.log(`   Facility ID: ${newUser.facility_id}`);
        }
      } else {
        console.log('❌ No facilities found! Need to create facilities first.');
      }
    }

    // 4. Check trips for facility users
    console.log('\n4️⃣ Checking trips for facility users...');
    const facilityUserIds = facilityUsers.map(u => u.id);
    
    if (facilityUserIds.length > 0) {
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, pickup_time, status, price, user_id')
        .in('user_id', facilityUserIds)
        .order('pickup_time', { ascending: false })
        .limit(10);

      if (!tripsError && trips?.length > 0) {
        console.log(`✅ Found ${trips.length} trips for facility users:`);
        trips.forEach(trip => {
          const tripDate = new Date(trip.pickup_time);
          console.log(`   - ${tripDate.toDateString()} | ${trip.status} | $${trip.price || 'NULL'}`);
        });
      } else {
        console.log('❌ No trips found for facility users');
        console.log('💡 This explains why the billing page shows no data!');
      }
    }

    console.log('\n🎯 SUMMARY:');
    console.log('============');
    console.log(`• Total users: ${allUsers?.length || 0}`);
    console.log(`• Facility users: ${facilityUsers.length}`);
    console.log(`• Facilities available: ${facilities?.length || 0}`);
    
    if (facilityUsers.length === 0) {
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('You need to log in as a user with "facility" role to see billing data.');
      console.log('The billing page checks for role === "facility" and facility_id !== null');
    }

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

// Run the check
checkUserProfileIssue().then(() => {
  console.log('\n✅ User profile check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
