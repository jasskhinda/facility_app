import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createMissingOwners() {
  try {
    console.log('🔍 Finding facilities without owners...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find facilities without owners
    const { data: facilitiesWithoutOwners } = await adminSupabase
      .from('facilities')
      .select(`
        id,
        name,
        email,
        contact_person
      `)
      .not('id', 'in', `(
        SELECT facility_id 
        FROM facility_users 
        WHERE is_owner = true 
        AND status = 'active'
      )`);

    console.log(`📊 Found ${facilitiesWithoutOwners?.length || 0} facilities without owners`);

    if (!facilitiesWithoutOwners || facilitiesWithoutOwners.length === 0) {
      console.log('✅ All facilities already have owners');
      return;
    }

    // For each facility, create an owner
    for (const facility of facilitiesWithoutOwners) {
      console.log(`\n🏥 Processing facility: ${facility.name}`);
      
      // Try to find existing users for this facility
      const { data: existingUsers } = await adminSupabase
        .from('facility_users')
        .select('user_id, role, created_at')
        .eq('facility_id', facility.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (existingUsers && existingUsers.length > 0) {
        // Promote the earliest user to owner
        const earliestUser = existingUsers[0];
        console.log(`👑 Promoting existing user to owner: ${earliestUser.user_id}`);
        
        const { error: updateError } = await adminSupabase
          .from('facility_users')
          .update({
            role: 'super_admin',
            is_owner: true
          })
          .eq('user_id', earliestUser.user_id)
          .eq('facility_id', facility.id);

        if (updateError) {
          console.error(`❌ Failed to promote user: ${updateError.message}`);
        } else {
          console.log(`✅ Successfully promoted user to owner`);
        }
      } else {
        // Create a new owner
        console.log(`👤 Creating new owner for facility`);
        
        // Generate owner details
        const ownerEmail = facility.email || `admin@${facility.name.toLowerCase().replace(/\s+/g, '')}.com`;
        const ownerFirstName = facility.contact_person?.split(' ')[0] || 'Admin';
        const ownerLastName = facility.contact_person?.split(' ').slice(1).join(' ') || 'User';
        const ownerPassword = `${facility.name.replace(/\s+/g, '')}${new Date().getFullYear()}!`;

        console.log(`📧 Owner email: ${ownerEmail}`);
        console.log(`👤 Owner name: ${ownerFirstName} ${ownerLastName}`);

        // Create auth user
        const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
          email: ownerEmail,
          password: ownerPassword,
          email_confirm: true,
          user_metadata: {
            first_name: ownerFirstName,
            last_name: ownerLastName,
            role: 'facility'
          }
        });

        if (authError) {
          console.error(`❌ Failed to create auth user: ${authError.message}`);
          continue;
        }

        console.log(`✅ Auth user created: ${newUser.user.id}`);

        // Update profile
        const { error: profileError } = await adminSupabase
          .from('profiles')
          .update({
            first_name: ownerFirstName,
            last_name: ownerLastName,
            facility_id: facility.id,
            role: 'facility',
            email: ownerEmail,
            status: 'active'
          })
          .eq('id', newUser.user.id);

        if (profileError) {
          console.error(`❌ Failed to update profile: ${profileError.message}`);
          // Clean up auth user
          await adminSupabase.auth.admin.deleteUser(newUser.user.id);
          continue;
        }

        console.log(`✅ Profile updated`);

        // Create facility_users entry
        const { error: facilityUserError } = await adminSupabase
          .from('facility_users')
          .insert({
            facility_id: facility.id,
            user_id: newUser.user.id,
            role: 'super_admin',
            is_owner: true,
            invited_by: null,
            status: 'active'
          });

        if (facilityUserError) {
          console.error(`❌ Failed to create facility user: ${facilityUserError.message}`);
        } else {
          console.log(`✅ Facility owner created successfully`);
          console.log(`🔑 Credentials: ${ownerEmail} / ${ownerPassword}`);
        }
      }
    }

    console.log('\n🎉 Finished processing all facilities');

    // Show summary
    console.log('\n📊 Summary of facility owners:');
    const { data: allOwners } = await adminSupabase
      .from('facility_users')
      .select(`
        facility_id,
        user_id,
        facilities(name),
        profiles(first_name, last_name, email)
      `)
      .eq('is_owner', true)
      .eq('status', 'active');

    if (allOwners) {
      allOwners.forEach(owner => {
        console.log(`🏥 ${owner.facilities.name}: ${owner.profiles.first_name} ${owner.profiles.last_name} (${owner.profiles.email})`);
      });
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createMissingOwners();