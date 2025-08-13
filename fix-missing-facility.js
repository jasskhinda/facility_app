require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixMissingFacility() {
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

  console.log('=== Fixing Missing Facility ===\n');

  try {
    // Get the profile with missing facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'facility')
      .single();

    if (profileError) {
      console.error('❌ Error getting facility profile:', profileError);
      return;
    }

    console.log('📋 Found facility profile:', {
      id: profile.id,
      email: profile.email,
      facility_id: profile.facility_id
    });

    // Check if facility exists
    const { data: existingFacility, error: facilityCheckError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', profile.facility_id)
      .single();

    if (existingFacility) {
      console.log('✅ Facility already exists');
      // Still need to create facility_users entry
    } else {
      console.log('🏗️ Creating missing facility...');

      // Create the missing facility
      const { data: newFacility, error: createError } = await supabase
        .from('facilities')
        .insert({
          id: profile.facility_id,
          name: 'Encompass Health Rehabilitation Hospital', // Based on the email domain
          address: 'Please update facility address',
          phone_number: 'Please update phone number',
          contact_email: profile.email,
          billing_email: profile.email,
          facility_type: 'rehabilitation_center',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating facility:', createError);
        return;
      }

      console.log('✅ Facility created successfully:', newFacility);
    }



    // Create a facility_users entry for the existing user
    console.log('👤 Creating facility_users entry...');
    const { data: facilityUser, error: facilityUserError } = await supabase
      .from('facility_users')
      .insert({
        user_id: profile.id,
        facility_id: profile.facility_id,
        role: 'super_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (facilityUserError) {
      console.error('❌ Error creating facility_users entry:', facilityUserError);
    } else {
      console.log('✅ Facility user entry created:', facilityUser);
    }

    console.log('\n🎉 Fix completed! The facility settings page should now work.');

  } catch (error) {
    console.error('❌ Fix script error:', error);
  }
}

fixMissingFacility();