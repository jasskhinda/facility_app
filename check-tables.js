import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check facility_users table
    console.log('📋 Checking facility_users table...');
    const { data: facilityUsers, error: facilityUsersError } = await adminSupabase
      .from('facility_users')
      .select('*');

    if (facilityUsersError) {
      console.error('❌ Error querying facility_users:', facilityUsersError);
    } else {
      console.log('✅ facility_users data:', facilityUsers);
    }

    // Check profiles table structure
    console.log('📋 Checking profiles table...');
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (profilesError) {
      console.error('❌ Error querying profiles:', profilesError);
    } else {
      console.log('✅ profiles sample data:', profiles);
    }

    // Try to create a test user to see what happens
    console.log('🧪 Testing user creation process...');
    
    const testEmail = 'test-' + Date.now() + '@example.com';
    const testPassword = 'TestPassword123!';
    
    console.log('👤 Creating test user in auth...');
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        role: 'facility'
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }

    console.log('✅ Test user created:', newUser.user.id);

    // Try to create profile
    console.log('📋 Creating test profile...');
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        first_name: 'Test',
        last_name: 'User',
        facility_id: '123e4567-e89b-12d3-a456-426614174000', // dummy facility ID
        role: 'facility'
      });

    if (profileError) {
      console.error('❌ Profile error:', profileError);
    } else {
      console.log('✅ Test profile created');
    }

    // Try to add to facility_users
    console.log('🏢 Adding to facility_users...');
    const { error: facilityUserError } = await adminSupabase
      .from('facility_users')
      .insert({
        facility_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: newUser.user.id,
        role: 'scheduler',
        invited_by: 'system',
        status: 'active'
      });

    if (facilityUserError) {
      console.error('❌ Facility user error:', facilityUserError);
    } else {
      console.log('✅ Test facility user created');
    }

    // Clean up test user
    console.log('🧹 Cleaning up test user...');
    await adminSupabase.auth.admin.deleteUser(newUser.user.id);
    console.log('✅ Test user cleaned up');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkTables();