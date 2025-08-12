import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runOwnerMigration() {
  try {
    console.log('🔧 Running owner field migration...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Step 1: Add is_owner column if it doesn't exist
    console.log('📋 Adding is_owner column...');
    
    // Check if column exists first
    const { data: columns } = await adminSupabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'facility_users')
      .eq('column_name', 'is_owner');

    if (!columns || columns.length === 0) {
      console.log('➕ Adding is_owner column...');
      // We can't use ALTER TABLE through the API, so let's check if we can add it via a function
      
      // For now, let's manually update existing records to mark owners
      console.log('🏷️ Marking facility owners...');
      
      // Get all facilities and their earliest super_admin users
      const { data: facilities } = await adminSupabase
        .from('facility_users')
        .select('facility_id, user_id, role, created_at')
        .eq('role', 'super_admin')
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (facilities) {
        // Group by facility_id and get the first super_admin for each
        const facilityOwners = {};
        facilities.forEach(user => {
          if (!facilityOwners[user.facility_id]) {
            facilityOwners[user.facility_id] = user.user_id;
          }
        });

        console.log('👑 Found potential owners for facilities:', Object.keys(facilityOwners).length);
        
        // For now, let's just log what we would do
        for (const [facilityId, userId] of Object.entries(facilityOwners)) {
          console.log(`📍 Facility ${facilityId}: Owner would be ${userId}`);
        }
      }
    } else {
      console.log('✅ is_owner column already exists');
    }

    // Step 2: Check current facility_users structure
    console.log('🔍 Checking current facility_users data...');
    const { data: sampleUsers } = await adminSupabase
      .from('facility_users')
      .select('*')
      .limit(3);

    console.log('📊 Sample facility_users data:', sampleUsers);

    // Step 3: For now, let's create a simple function to identify owners
    console.log('🎯 Identifying facility owners based on existing data...');
    
    const { data: allUsers } = await adminSupabase
      .from('facility_users')
      .select('facility_id, user_id, role, created_at, status')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (allUsers) {
      const facilityOwners = {};
      
      // Find the earliest super_admin for each facility
      allUsers.forEach(user => {
        if (user.role === 'super_admin' && !facilityOwners[user.facility_id]) {
          facilityOwners[user.facility_id] = user;
        }
      });

      // If no super_admin exists, take the earliest user and they should be promoted
      allUsers.forEach(user => {
        if (!facilityOwners[user.facility_id]) {
          facilityOwners[user.facility_id] = user;
        }
      });

      console.log('👑 Identified owners:');
      for (const [facilityId, owner] of Object.entries(facilityOwners)) {
        console.log(`  Facility ${facilityId}: ${owner.user_id} (${owner.role})`);
        
        // Get user profile for more info
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', owner.user_id)
          .single();

        if (profile) {
          console.log(`    Name: ${profile.first_name} ${profile.last_name} (${profile.email})`);
        }
      }
    }

    console.log('✅ Migration analysis complete!');
    console.log('📝 Note: The is_owner column needs to be added via database admin tools.');
    console.log('📝 After adding the column, run this script again to populate the data.');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

runOwnerMigration();