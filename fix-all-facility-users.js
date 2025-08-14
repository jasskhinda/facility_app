require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixAllFacilityUsers() {
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

  console.log('=== Fixing All Facility Users ===\n');

  try {
    // Get all facility profiles
    const { data: facilityProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'facility');

    if (profilesError) {
      console.error('❌ Error getting facility profiles:', profilesError);
      return;
    }

    console.log(`📋 Found ${facilityProfiles.length} facility profiles`);

    // Get existing facility_users
    const { data: existingFacilityUsers, error: facilityUsersError } = await supabase
      .from('facility_users')
      .select('user_id');

    if (facilityUsersError) {
      console.error('❌ Error getting facility_users:', facilityUsersError);
      return;
    }

    const existingUserIds = new Set(existingFacilityUsers.map(fu => fu.user_id));
    console.log(`👥 Found ${existingFacilityUsers.length} existing facility_users entries`);

    // Create missing facility_users entries
    for (const profile of facilityProfiles) {
      if (existingUserIds.has(profile.id)) {
        console.log(`✅ ${profile.email} already has facility_users entry`);
        continue;
      }

      console.log(`🔧 Creating facility_users entry for ${profile.email}...`);

      const { data: newFacilityUser, error: createError } = await supabase
        .from('facility_users')
        .insert({
          user_id: profile.id,
          facility_id: profile.facility_id,
          role: 'super_admin', // Default role for facility owners
          status: 'active',
          is_owner: true, // Mark as owner since they're the facility account holder
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error(`❌ Error creating facility_users entry for ${profile.email}:`, createError);
      } else {
        console.log(`✅ Created facility_users entry for ${profile.email}`);
      }
    }

    console.log('\n🎉 All facility users have been processed!');

    // Verify the fix
    console.log('\n=== Verification ===');
    const { data: allFacilityUsers, error: verifyError } = await supabase
      .from('facility_users')
      .select('*');

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
    } else {
      console.log(`✅ Total facility_users entries: ${allFacilityUsers.length}`);
      allFacilityUsers.forEach(fu => {
        console.log(`  - User: ${fu.user_id}, Facility: ${fu.facility_id}, Role: ${fu.role}, Owner: ${fu.is_owner}`);
      });
    }

  } catch (error) {
    console.error('❌ Fix script error:', error);
  }
}

fixAllFacilityUsers();