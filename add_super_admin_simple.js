// add_super_admin_simple.js - Script to add webteam user through existing admin
const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase client
const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addSuperAdminSimple() {
  try {
    console.log('This script requires you to first manually create the auth user through Supabase Dashboard');
    console.log('Then run this script to add them to the facility');
    console.log('');
    
    // Get command line arguments
    const existingAdminEmail = process.argv[2];
    const existingAdminPassword = process.argv[3];
    
    if (!existingAdminEmail || !existingAdminPassword) {
      console.error('Usage: node add_super_admin_simple.js existing_admin@email.com admin_password');
      console.error('');
      console.error('Steps to add webteam@nationalchurchresidences.org:');
      console.error('1. Go to Supabase Dashboard > Authentication > Users');
      console.error('2. Click "Add User" and create:');
      console.error('   Email: webteam@nationalchurchresidences.org');
      console.error('   Password: Openmyadmin5!');
      console.error('3. Copy the new user ID that was created');
      console.error('4. Then run: node add_super_admin_simple.js sjackson@nationalchurchresidences.org [sjackson_password]');
      process.exit(1);
    }

    // Sign in with existing admin
    console.log('Signing in with existing admin...');
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: existingAdminEmail,
      password: existingAdminPassword
    });

    if (signInError) {
      console.error('Error signing in:', signInError.message);
      console.error('Make sure the email/password is correct for an existing admin');
      process.exit(1);
    }

    console.log('Signed in as:', user.email);

    // Get the facility ID for this admin
    const { data: facilityUser, error: facilityError } = await supabase
      .from('facility_users')
      .select('facility_id, facilities!inner(name)')
      .eq('user_id', user.id)
      .single();

    if (facilityError) {
      console.error('Error finding your facility:', facilityError.message);
      process.exit(1);
    }

    console.log('Found your facility:', facilityUser.facilities.name);

    // Look for the webteam user in auth
    console.log('Looking for webteam@nationalchurchresidences.org in system...');
    
    // We need to manually provide the user ID since we can't search auth.users with anon key
    console.log('');
    console.log('⚠️  MANUAL STEP REQUIRED:');
    console.log('1. Go to Supabase Dashboard > Authentication > Users');
    console.log('2. Find webteam@nationalchurchresidences.org');
    console.log('3. Copy the User ID (UUID)');
    console.log('4. Run: node add_to_facility.js [USER_ID]');
    
    // Create the second script
    await createAddToFacilityScript(facilityUser.facility_id);
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

async function createAddToFacilityScript(facilityId) {
  const scriptContent = `// add_to_facility.js - Add user to facility after they're created in Supabase Dashboard
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addToFacility() {
  const webteamUserId = process.argv[2];
  
  if (!webteamUserId) {
    console.error('Usage: node add_to_facility.js [USER_ID_FROM_DASHBOARD]');
    process.exit(1);
  }
  
  try {
    // Sign in as the existing admin first
    console.log('Please provide admin credentials to add user to facility:');
    const adminEmail = 'sjackson@nationalchurchresidences.org'; // or prompt for this
    const adminPassword = process.argv[3];
    
    if (!adminPassword) {
      console.error('Usage: node add_to_facility.js [USER_ID] [ADMIN_PASSWORD]');
      process.exit(1);
    }
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    
    if (signInError) {
      console.error('Error signing in as admin:', signInError.message);
      process.exit(1);
    }
    
    console.log('Signed in as admin');
    
    // Create profile for webteam user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: webteamUserId,
        email: 'webteam@nationalchurchresidences.org',
        first_name: 'Web',
        last_name: 'Team',
        role: 'facility',
        facility_id: '${facilityId}'
      });
    
    if (profileError) {
      console.error('Error creating profile:', profileError.message);
      if (profileError.message.includes('already exists')) {
        console.log('Profile already exists, continuing...');
      } else {
        process.exit(1);
      }
    } else {
      console.log('✅ Profile created');
    }
    
    // Add to facility_users with super_admin role
    const { error: facilityUserError } = await supabase
      .from('facility_users')
      .insert({
        facility_id: '${facilityId}',
        user_id: webteamUserId,
        role: 'super_admin',
        is_owner: false,
        status: 'active'
      });
    
    if (facilityUserError) {
      console.error('Error adding to facility_users:', facilityUserError.message);
      if (facilityUserError.message.includes('already exists')) {
        console.log('User already in facility, updating role...');
        
        const { error: updateError } = await supabase
          .from('facility_users')
          .update({ role: 'super_admin', status: 'active' })
          .eq('user_id', webteamUserId)
          .eq('facility_id', '${facilityId}');
        
        if (updateError) {
          console.error('Error updating role:', updateError.message);
          process.exit(1);
        }
        console.log('✅ Role updated to super_admin');
      } else {
        process.exit(1);
      }
    } else {
      console.log('✅ Added to facility as super_admin');
    }
    
    console.log('');
    console.log('🎉 SUCCESS! webteam@nationalchurchresidences.org is now a Super Admin');
    console.log('   They can login with password: Openmyadmin5!');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

addToFacility();`;

  require('fs').writeFileSync('/Volumes/C/CCTAPPS/facility_app/add_to_facility.js', scriptContent);
  console.log('✅ Created add_to_facility.js script');
}

addSuperAdminSimple();