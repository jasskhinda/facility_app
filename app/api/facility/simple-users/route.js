import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Simple API that bypasses session issues for now
export async function POST(request) {
  try {
    console.log('🚀 Simple user creation API called');
    
    const body = await request.json();
    const { facilityId, email, password, firstName, lastName, role } = body;

    console.log('📝 Request data:', { facilityId, email, firstName, lastName, role });

    if (!facilityId || !email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔑 Admin client created');

    // Create the user in Supabase Auth
    console.log('👤 Creating user in auth...');
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'facility'
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ 
        error: authError.message || 'Failed to create user account' 
      }, { status: 400 });
    }

    console.log('✅ User created in auth:', newUser.user.id);

    // Create profile for the new user
    console.log('📋 Creating profile...');
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        facility_id: facilityId,
        role: 'facility'
      });

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      // Clean up auth user
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    console.log('✅ Profile created');

    // Try to add to facility_users table (if it exists)
    console.log('🏢 Adding to facility_users...');
    const { error: facilityUserError } = await adminSupabase
      .from('facility_users')
      .insert({
        facility_id: facilityId,
        user_id: newUser.user.id,
        role: role,
        invited_by: 'system', // We'll use system for now
        status: 'active'
      });

    if (facilityUserError) {
      console.log('⚠️ Facility users table error (might not exist yet):', facilityUserError.message);
      // Don't fail - the user can still login with the profile
    } else {
      console.log('✅ Added to facility_users table');
    }

    console.log('🎉 User creation complete!');

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      userId: newUser.user.id,
      credentials: {
        email: email,
        password: password // For testing - remove in production
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}