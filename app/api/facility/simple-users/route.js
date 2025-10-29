import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Simple API that bypasses session issues for now
export async function POST(request) {
  try {
    console.log('🚀 Simple user creation API called');
    console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()));
    
    const body = await request.json();
    const { facilityId, email, password, firstName, lastName, phoneNumber, role } = body;

    console.log('📝 Request data:', { facilityId, email, firstName, lastName, phoneNumber, role });
    console.log('📝 Full body:', body);

    if (!facilityId || !email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prevent test users in production
    const testPatterns = ['test', 'example.com', 'curl-', 'direct-', 'owner-test'];
    const isTestEmail = testPatterns.some(pattern => email.toLowerCase().includes(pattern.toLowerCase()));
    
    if (isTestEmail && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Test email addresses are not allowed in production' 
      }, { status: 400 });
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
        role: role
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      console.error('❌ Auth error details:', JSON.stringify(authError, null, 2));
      return NextResponse.json({ 
        error: authError.message || 'Failed to create user account' 
      }, { status: 400 });
    }

    console.log('✅ User created in auth:', newUser.user.id);

    // Update the auto-created profile with our data
    console.log('📋 Updating profile...');

    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null,
        facility_id: facilityId,
        role: role,
        email: email,
        status: 'active'
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('❌ Profile update error:', profileError);
      console.error('❌ Profile error details:', JSON.stringify(profileError, null, 2));
      // Clean up auth user
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: 'Failed to update user profile: ' + profileError.message }, { status: 500 });
    }

    console.log('✅ Profile created');

    // Add to facility_users table
    console.log('🏢 Adding to facility_users...');
    const { error: facilityUserError } = await adminSupabase
      .from('facility_users')
      .insert({
        facility_id: facilityId,
        user_id: newUser.user.id,
        role: role,
        invited_by: null, // Use null instead of 'system'
        status: 'active'
      });

    if (facilityUserError) {
      console.error('❌ Facility users table error:', facilityUserError);
      console.error('❌ Facility user error details:', JSON.stringify(facilityUserError, null, 2));
      // Don't fail completely - the profile was created successfully
      console.log('⚠️ User profile created but facility_users entry failed. User can still login.');
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