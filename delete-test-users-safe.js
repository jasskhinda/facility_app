import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function deleteTestUsersSafe() {
  try {
    console.log('🗑️  Safely deleting test users...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Specific test user IDs to delete (from the output above)
    const testUserIds = [
      'dad8b3ba-268f-4796-be8f-7471970675b5', // test-1755026649307@example.com
      '64a637e3-7380-4aa4-8342-3cad343afa68', // test-user-1755027424313@example.com
      '04eebc45-28f4-4268-958b-c7baf3c4453f', // auto-profile-test-1755027483375@example.com
      '6c4c193e-3049-4317-bc04-f882f1fa25d1', // direct-test-1755027541097@example.com
      '595897dd-2e26-40f0-8aea-42f5e7e603c4', // curl-test-1755027576@example.com
      '2a7655e9-474b-4c0f-b429-c4978e72683b'  // owner-test-1755033691@example.com
    ];

    console.log(`📊 Deleting ${testUserIds.length} test users...`);

    for (const userId of testUserIds) {
      try {
        console.log(`\n🗑️  Deleting user: ${userId}`);
        
        // Get user info first
        const { data: userInfo } = await adminSupabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .single();

        if (userInfo) {
          console.log(`   User: ${userInfo.first_name} ${userInfo.last_name} (${userInfo.email})`);
        }

        // Step 1: Delete from facility_users
        const { error: facilityUserError } = await adminSupabase
          .from('facility_users')
          .delete()
          .eq('user_id', userId);

        if (facilityUserError) {
          console.log(`   ⚠️  Facility user deletion: ${facilityUserError.message}`);
        } else {
          console.log(`   ✅ Removed from facility_users`);
        }

        // Step 2: Delete from profiles
        const { error: profileError } = await adminSupabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.log(`   ⚠️  Profile deletion: ${profileError.message}`);
        } else {
          console.log(`   ✅ Removed from profiles`);
        }

        // Step 3: Delete from auth
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);

        if (authError) {
          console.log(`   ⚠️  Auth deletion: ${authError.message}`);
        } else {
          console.log(`   ✅ Removed from auth`);
        }

        console.log(`   🎉 User ${userId} deleted successfully`);

      } catch (userError) {
        console.error(`   ❌ Error deleting user ${userId}:`, userError.message);
      }
    }

    console.log('\n🎉 Test user cleanup completed!');

    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const { data: remainingTestUsers } = await adminSupabase
      .from('profiles')
      .select('email, first_name, last_name')
      .or('email.like.%test%,email.like.%@example.com%');

    if (remainingTestUsers && remainingTestUsers.length > 0) {
      console.log('⚠️  Remaining test-like users:');
      remainingTestUsers.forEach(user => {
        console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
      });
    } else {
      console.log('✅ No test users remaining');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

deleteTestUsersSafe();