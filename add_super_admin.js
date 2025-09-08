// add_super_admin.js - Script to add webteam@nationalchurchresidences.org as Super Admin
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey && !supabaseAnonKey) {
  console.error('Missing both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Use service key if available, otherwise anon key (but warn user)
const keyToUse = supabaseServiceKey || supabaseAnonKey;
if (!supabaseServiceKey) {
  console.warn('⚠️  Using anon key - you may need the service role key for user creation');
  console.warn('⚠️  Set SUPABASE_SERVICE_ROLE_KEY in .env.local for full admin privileges');
}

const supabase = createClient(supabaseUrl, keyToUse, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addSuperAdmin() {
  try {
    console.log('Starting Super Admin addition process...');
    
    // First, find the existing sjackson user and their facility
    const { data: existingUsers, error: userError } = await supabase
      .from('facility_users')
      .select(`
        *,
        facilities!inner(id, name),
        profiles!inner(email)
      `)
      .eq('profiles.email', 'sjackson@nationalchurchresidences.org')
      .single();
    
    if (userError) {
      console.error('Error finding existing user:', userError.message);
      
      // Try a different approach - look in auth.users directly
      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.error('Error listing auth users:', authError.message);
        return;
      }
      
      const sjacksonUser = authUser.users.find(u => u.email === 'sjackson@nationalchurchresidences.org');
      if (!sjacksonUser) {
        console.error('sjackson@nationalchurchresidences.org user not found in auth system');
        return;
      }
      
      console.log('Found sjackson user in auth:', sjacksonUser.id);
      
      // Now find their facility
      const { data: facilityUser, error: facilityError } = await supabase
        .from('facility_users')
        .select('facility_id, facilities!inner(name)')
        .eq('user_id', sjacksonUser.id)
        .single();
      
      if (facilityError) {
        console.error('Error finding sjackson facility:', facilityError.message);
        return;
      }
      
      console.log('Found facility:', facilityUser.facilities.name);
      
      // Now create the new user
      await createWebteamUser(facilityUser.facility_id);
      return;
    }
    
    console.log('Found existing user in facility:', existingUsers.facilities.name);
    await createWebteamUser(existingUsers.facility_id);
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

async function createWebteamUser(facilityId) {
  try {
    console.log('Creating webteam@nationalchurchresidences.org user...');
    
    // First, create the auth user
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'webteam@nationalchurchresidences.org',
      password: 'Openmyadmin5!',
      email_confirm: true
    });
    
    if (createError) {
      console.error('Error creating auth user:', createError.message);
      return;
    }
    
    console.log('Auth user created:', authUser.user.id);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: 'webteam@nationalchurchresidences.org',
        first_name: 'Web',
        last_name: 'Team',
        role: 'facility',
        facility_id: facilityId
      });
    
    if (profileError) {
      console.error('Error creating profile:', profileError.message);
      return;
    }
    
    console.log('Profile created successfully');
    
    // Add to facility_users with super_admin role
    const { error: facilityUserError } = await supabase
      .from('facility_users')
      .insert({
        facility_id: facilityId,
        user_id: authUser.user.id,
        role: 'super_admin',
        is_owner: false,
        status: 'active'
      });
    
    if (facilityUserError) {
      console.error('Error adding to facility_users:', facilityUserError.message);
      return;
    }
    
    console.log('✅ Successfully created webteam@nationalchurchresidences.org as Super Admin');
    console.log('✅ User can now login with password: Openmyadmin5!');
    
  } catch (err) {
    console.error('Error in createWebteamUser:', err.message);
  }
}

addSuperAdmin();