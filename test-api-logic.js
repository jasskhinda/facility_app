import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testAPILogic() {
  try {
    console.log('🧪 Testing API logic directly...');
    
    const facilityId = '39fad399-1707-495c-bbb9-7bf153117309'; // Encompass facility
    const email = 'direct-test-' + Date.now() + '@example.com';
    const password = 'TestPassword123!';
    const firstName = 'Direct';
    const lastName = 'Test';
    const role = 'scheduler';

    console.log('📝 Test data:', { facilityId, email, firstName, lastName, role });

    if (!facilityId || !email || !password || !firstName || !lastName || !role) {
      console.error('❌ Missing required fields');
      return;
    }

    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔑 Admin client created');

    // Create the user in Supabase Auth
    console.log('👤 Creating user in auth...');
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: password,
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

    // Update the auto-created profile with our data
    console.log('📋 Updating profile...');
    
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        facility_id: facilityId,
        role: 'facility',
        email: email,
        status: 'active'
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('❌ Profile update error:', profileError);
      // Clean up auth user
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return;
    }

    console.log('✅ Profile updated');

    // Add to facility_users table
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
      console.error('❌ Facility users table error:', facilityUserError);
      console.log('⚠️ User profile created but facility_users entry failed. User can still login.');
    } else {
      console.log('✅ Added to facility_users table');
    }

    console.log('🎉 User creation complete!');
    console.log('📧 Credentials:', { email, password });

    // Verify the user
    console.log('🔍 Verifying user...');
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single();

    console.log('👤 Created profile:', profile);

    const { data: facilityUser } = await adminSupabase
      .from('facility_users')
      .select('*')
      .eq('user_id', newUser.user.id)
      .single();

    console.log('🏢 Created facility user:', facilityUser);

    // Don't clean up so we can test login
    console.log('✅ Test user created successfully - not cleaning up for testing');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testAPILogic();