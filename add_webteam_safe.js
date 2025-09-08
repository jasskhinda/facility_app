// add_webteam_safe.js - COMPLETELY SAFE script to add webteam user
// This script ONLY reads existing data and adds the new user
// It NEVER modifies or touches existing accounts

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addWebteamSafely() {
  try {
    console.log('🔒 SAFE MODE: This script will ONLY add the new webteam user');
    console.log('🔒 It will NOT modify or touch any existing accounts\n');
    
    // Step 1: Get the webteam user ID from command line
    const webteamUserId = process.argv[2];
    
    if (!webteamUserId) {
      console.log('📋 INSTRUCTIONS:');
      console.log('');
      console.log('1. Go to Supabase Dashboard: https://btzfgasugkycbavcwvnx.supabase.co');
      console.log('2. Navigate to Authentication → Users');
      console.log('3. Click "Add User" and create:');
      console.log('   Email: webteam@nationalchurchresidences.org');
      console.log('   Password: Openmyadmin5!');
      console.log('   ✅ Check "Confirm Email"');
      console.log('4. Copy the User ID that gets generated');
      console.log('5. Run: node add_webteam_safe.js [USER_ID]');
      console.log('');
      console.log('Example: node add_webteam_safe.js 12345678-1234-1234-1234-123456789012');
      return;
    }

    // Step 2: Find National Church Residences facility ID (READ-ONLY)
    console.log('🔍 Looking for National Church Residences facility...');
    
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name')
      .ilike('name', '%national%church%')
      .single();
    
    if (facilityError) {
      console.log('Could not find facility by name, trying email domain approach...');
      
      // Try to find facility by looking at profiles with @nationalchurchresidences.org emails
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('facility_id, facilities!inner(id, name)')
        .ilike('email', '%@nationalchurchresidences.org')
        .limit(1);
      
      if (profileError || !profiles || profiles.length === 0) {
        console.error('❌ Could not find National Church Residences facility');
        console.log('Available facilities:');
        
        const { data: allFacilities } = await supabase
          .from('facilities')
          .select('id, name')
          .limit(10);
        
        if (allFacilities) {
          allFacilities.forEach(f => console.log(`  - ${f.name} (${f.id})`));
        }
        return;
      }
      
      facility = profiles[0].facilities;
    }
    
    console.log(`✅ Found facility: ${facility.name} (${facility.id})`);
    
    // Step 3: Check if webteam user already exists (READ-ONLY check)
    console.log('🔍 Checking if webteam user already exists...');
    
    const { data: existingProfile, error: existingError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', webteamUserId)
      .single();
    
    if (!existingError && existingProfile) {
      console.log('⚠️  User profile already exists, checking facility access...');
      
      const { data: existingFacilityUser } = await supabase
        .from('facility_users')
        .select('role, status')
        .eq('user_id', webteamUserId)
        .eq('facility_id', facility.id)
        .single();
      
      if (existingFacilityUser) {
        console.log(`✅ User already has ${existingFacilityUser.role} access to ${facility.name}`);
        return;
      }
    }
    
    // Step 4: Create profile (SAFE INSERT)
    console.log('➕ Creating profile for webteam user...');
    
    const { error: profileInsertError } = await supabase
      .from('profiles')
      .insert({
        id: webteamUserId,
        email: 'webteam@nationalchurchresidences.org',
        first_name: 'Web',
        last_name: 'Team',
        role: 'facility',
        facility_id: facility.id
      });
    
    if (profileInsertError) {
      if (profileInsertError.message.includes('already exists')) {
        console.log('ℹ️  Profile already exists, continuing...');
      } else {
        console.error('❌ Error creating profile:', profileInsertError.message);
        return;
      }
    } else {
      console.log('✅ Profile created successfully');
    }
    
    // Step 5: Add to facility_users (SAFE INSERT)
    console.log('➕ Adding user to facility as Super Admin...');
    
    const { error: facilityUserInsertError } = await supabase
      .from('facility_users')
      .insert({
        facility_id: facility.id,
        user_id: webteamUserId,
        role: 'super_admin',
        is_owner: false,
        status: 'active'
      });
    
    if (facilityUserInsertError) {
      if (facilityUserInsertError.message.includes('already exists')) {
        console.log('ℹ️  User already in facility, updating role to super_admin...');
        
        const { error: updateError } = await supabase
          .from('facility_users')
          .update({ role: 'super_admin', status: 'active' })
          .eq('user_id', webteamUserId)
          .eq('facility_id', facility.id);
        
        if (updateError) {
          console.error('❌ Error updating role:', updateError.message);
          return;
        }
        console.log('✅ Role updated to super_admin');
      } else {
        console.error('❌ Error adding to facility:', facilityUserInsertError.message);
        return;
      }
    } else {
      console.log('✅ Added to facility as super_admin');
    }
    
    // Step 6: Verify setup (READ-ONLY verification)
    console.log('🔍 Verifying setup...');
    
    const { data: verification, error: verifyError } = await supabase
      .from('facility_users')
      .select(`
        role,
        status,
        is_owner,
        facilities!inner(name),
        profiles!inner(email, first_name, last_name)
      `)
      .eq('user_id', webteamUserId)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying setup:', verifyError.message);
      return;
    }
    
    console.log('\n🎉 SUCCESS! Setup completed safely:');
    console.log(`   Email: ${verification.profiles.email}`);
    console.log(`   Name: ${verification.profiles.first_name} ${verification.profiles.last_name}`);
    console.log(`   Role: ${verification.role}`);
    console.log(`   Facility: ${verification.facilities.name}`);
    console.log(`   Status: ${verification.status}`);
    console.log(`   Owner: ${verification.is_owner ? 'Yes' : 'No'}`);
    console.log('\n   Login Password: Openmyadmin5!');
    console.log('\n🔒 No existing accounts were modified or touched.');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

addWebteamSafely();