// Migration script to transition existing facility users to new user management system
// Run this script to migrate existing facility users to the new facility_users table

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

async function migrateFacilityUsers() {
  try {
    console.log('🚀 Starting facility user migration...');
    
    // Get all existing facility users from profiles table
    const { data: facilityProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, facility_id, role')
      .eq('role', 'facility')
      .not('facility_id', 'is', null);
    
    if (profilesError) {
      throw profilesError;
    }
    
    console.log(`📊 Found ${facilityProfiles.length} facility users to migrate`);
    
    if (facilityProfiles.length === 0) {
      console.log('✅ No facility users found to migrate');
      return;
    }
    
    // Migrate each facility user to the new system
    for (const profile of facilityProfiles) {
      try {
        // Check if user already exists in facility_users table
        const { data: existingUser, error: checkError } = await supabase
          .from('facility_users')
          .select('id')
          .eq('facility_id', profile.facility_id)
          .eq('user_id', profile.id)
          .single();
        
        if (existingUser) {
          console.log(`⏭️  User ${profile.id} already migrated, skipping...`);
          continue;
        }
        
        // Insert into facility_users table as super_admin (existing facility users become super admins)
        const { error: insertError } = await supabase
          .from('facility_users')
          .insert({
            facility_id: profile.facility_id,
            user_id: profile.id,
            role: 'super_admin',
            status: 'active',
            invited_by: profile.id, // Self-invited for migration
            invited_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Error migrating user ${profile.id}:`, insertError);
          continue;
        }
        
        console.log(`✅ Migrated user ${profile.id} as super_admin for facility ${profile.facility_id}`);
        
      } catch (userError) {
        console.error(`❌ Error processing user ${profile.id}:`, userError);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Test the new user management features in your facility settings');
    console.log('2. Invite additional users as needed');
    console.log('3. The old profiles.role field is still preserved for backward compatibility');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateFacilityUsers()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateFacilityUsers };