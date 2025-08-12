import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function cleanupTestUsers() {
  try {
    console.log('🧹 Cleaning up test users...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find test users (emails containing 'test', 'curl', 'direct', etc.)
    const testEmailPatterns = [
      'owner-test-',
      'curl-test-',
      'direct-test-',
      'api-test-',
      'test-user-',
      '@example.com'
    ];

    console.log('🔍 Finding test users...');
    
    // Get all users with test-like emails
    const { data: testUsers, error: findError } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, facility_id')
      .or(testEmailPatterns.map(pattern => `email.like.%${pattern}%`).join(','));

    if (findError) {
      console.error('❌ Error finding test users:', findError);
      return;
    }

    if (!testUsers || testUsers.length === 0) {
      console.log('✅ No test users found');
      return;
    }

    console.log(`📊 Found ${testUsers.length} test users:`);
    testUsers.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name} (${user.email})`);
    });

    // Ask for confirmation
    console.log('\n⚠️  These users will be permanently deleted.');
    console.log('This will remove them from:');
    console.log('  - Auth users');
    console.log('  - Profiles');
    console.log('  - Facility users');
    console.log('  - Any associated data');

    // For safety, let's just show what would be deleted without actually deleting
    console.log('\n🔒 SAFETY MODE: Not actually deleting (remove this check to delete)');
    
    for (const user of testUsers) {
      console.log(`\n👤 Would delete: ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Facility: ${user.facility_id}`);
      
      // Check facility_users entries
      const { data: facilityUserEntries } = await adminSupabase
        .from('facility_users')
        .select('facility_id, role, is_owner')
        .eq('user_id', user.id);
      
      if (facilityUserEntries && facilityUserEntries.length > 0) {
        facilityUserEntries.forEach(entry => {
          console.log(`   Facility Role: ${entry.role} ${entry.is_owner ? '(OWNER)' : ''}`);
        });
      }
    }

    console.log('\n💡 To actually delete these users, modify this script to remove the safety check.');

    // Uncomment the following code to actually delete (BE CAREFUL!)
    /*
    for (const user of testUsers) {
      console.log(`\n🗑️  Deleting ${user.first_name} ${user.last_name}...`);
      
      // Delete from facility_users first
      await adminSupabase
        .from('facility_users')
        .delete()
        .eq('user_id', user.id);
      
      // Delete from profiles (this should cascade)
      await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      // Delete from auth
      await adminSupabase.auth.admin.deleteUser(user.id);
      
      console.log(`✅ Deleted ${user.email}`);
    }
    */

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

cleanupTestUsers();