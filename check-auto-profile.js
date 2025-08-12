import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkAutoProfile() {
  try {
    console.log('🔍 Checking if profiles are auto-created...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const testEmail = 'auto-profile-test-' + Date.now() + '@example.com';
    const testPassword = 'TestPassword123!';

    // Create user in auth
    console.log('👤 Creating user in auth...');
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Auto',
        last_name: 'Test',
        role: 'facility'
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }

    console.log('✅ User created in auth:', newUser.user.id);

    // Check if profile was auto-created
    console.log('🔍 Checking for auto-created profile...');
    const { data: existingProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Profile check error:', profileError);
    } else if (existingProfile) {
      console.log('✅ Profile was auto-created:', existingProfile);
      
      // Update the existing profile with our data
      console.log('📝 Updating existing profile...');
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          first_name: 'Auto',
          last_name: 'Test',
          facility_id: '39fad399-1707-495c-bbb9-7bf153117309',
          role: 'facility',
          email: testEmail,
          status: 'active'
        })
        .eq('id', newUser.user.id);

      if (updateError) {
        console.error('❌ Profile update error:', updateError);
      } else {
        console.log('✅ Profile updated successfully');
      }
    } else {
      console.log('❌ No profile was auto-created');
    }

    // Clean up
    console.log('🧹 Cleaning up...');
    await adminSupabase.auth.admin.deleteUser(newUser.user.id);
    console.log('✅ Cleaned up');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkAutoProfile();