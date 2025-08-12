import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testUserCreation() {
  try {
    console.log('🧪 Testing complete user creation flow...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Use a real facility ID from the existing data
    const facilityId = '39fad399-1707-495c-bbb9-7bf153117309'; // Encompass facility
    const testEmail = 'test-user-' + Date.now() + '@example.com';
    const testPassword = 'TestPassword123!';
    const firstName = 'Test';
    const lastName = 'User';
    const role = 'scheduler';

    console.log('📝 Test data:', { facilityId, testEmail, firstName, lastName, role });

    // Step 1: Create user in auth
    console.log('👤 Creating user in auth...');
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'facility'
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }

    console.log('✅ User created in auth:', newUser.user.id);

    // Step 2: Create profile
    console.log('📋 Creating profile...');
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        facility_id: facilityId,
        role: 'facility',
        email: testEmail,
        status: 'active'
      });

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      // Clean up auth user
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return;
    }

    console.log('✅ Profile created');

    // Step 3: Add to facility_users
    console.log('🏢 Adding to facility_users...');
    const { error: facilityUserError } = await adminSupabase
      .from('facility_users')
      .insert({
        facility_id: facilityId,
        user_id: newUser.user.id,
        role: role,
        invited_by: null,
        status: 'active'
      });

    if (facilityUserError) {
      console.error('❌ Facility user error:', facilityUserError);
    } else {
      console.log('✅ Added to facility_users table');
    }

    // Step 4: Verify the user was created properly
    console.log('🔍 Verifying user creation...');
    const { data: createdProfile, error: verifyError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single();

    if (verifyError) {
      console.error('❌ Verify error:', verifyError);
    } else {
      console.log('✅ Profile verified:', createdProfile);
    }

    const { data: createdFacilityUser, error: verifyFacilityError } = await adminSupabase
      .from('facility_users')
      .select('*')
      .eq('user_id', newUser.user.id)
      .single();

    if (verifyFacilityError) {
      console.error('❌ Facility user verify error:', verifyFacilityError);
    } else {
      console.log('✅ Facility user verified:', createdFacilityUser);
    }

    console.log('🎉 User creation test completed successfully!');
    console.log('📧 Test credentials:', { email: testEmail, password: testPassword });

    // Clean up (comment this out if you want to keep the test user)
    console.log('🧹 Cleaning up test user...');
    await adminSupabase.auth.admin.deleteUser(newUser.user.id);
    console.log('✅ Test user cleaned up');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testUserCreation();