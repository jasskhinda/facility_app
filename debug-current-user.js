// Debug script to check current user and facility setup
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCurrentUser() {
  try {
    console.log('🔍 Debugging current user setup...\n');

    // Get the user that's currently logged in (from your browser session)
    // We'll use the email from the error logs: contact@greenvalleymed.com
    const userEmail = 'contact@greenvalleymed.com';
    
    console.log('1. Looking for user with email:', userEmail);
    
    // Find user in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    
    const currentUser = authUsers.users.find(u => u.email === userEmail);
    if (!currentUser) {
      console.log('❌ User not found in auth.users');
      return;
    }
    
    console.log('✅ Found user in auth.users:', currentUser.id);
    
    // Check profiles table
    console.log('\n2. Checking profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (profileError) {
      console.log('❌ Profile error:', profileError.message);
    } else {
      console.log('✅ Profile found:', {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        role: profile.role,
        facility_id: profile.facility_id
      });
    }
    
    // Check facility_users table
    console.log('\n3. Checking facility_users table...');
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('facility_users')
      .select('*')
      .eq('user_id', currentUser.id);
    
    if (facilityUsersError) {
      console.log('❌ Facility users error:', facilityUsersError.message);
    } else {
      console.log('✅ Facility users found:', facilityUsers.length);
      facilityUsers.forEach(fu => {
        console.log(`   - Facility: ${fu.facility_id}, Role: ${fu.role}, Status: ${fu.status}`);
      });
    }
    
    // Check facility info
    if (profile && profile.facility_id) {
      console.log('\n4. Checking facility info...');
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', profile.facility_id)
        .single();
      
      if (facilityError) {
        console.log('❌ Facility error:', facilityError.message);
      } else {
        console.log('✅ Facility found:', {
          id: facility.id,
          name: facility.name
        });
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('- User ID:', currentUser.id);
    console.log('- Profile Role:', profile?.role);
    console.log('- Facility ID:', profile?.facility_id);
    console.log('- Facility Users Count:', facilityUsers?.length || 0);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugCurrentUser();