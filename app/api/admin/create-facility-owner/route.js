import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// API to create facility owners - can be called from admin app or directly
export async function POST(request) {
  try {
    console.log('🚀 Create Facility Owner API called');
    
    const body = await request.json();
    const { facilityId, email, firstName, lastName, password, adminKey } = body;

    console.log('📝 Request data:', { facilityId, email, firstName, lastName });

    // Validate required fields
    if (!facilityId || !email || !firstName || !lastName) {
      return NextResponse.json({ 
        error: 'Missing required fields: facilityId, email, firstName, lastName' 
      }, { status: 400 });
    }

    // Simple admin key check (you can make this more sophisticated)
    if (adminKey !== process.env.FACILITY_ADMIN_KEY) {
      return NextResponse.json({ 
        error: 'Invalid admin key' 
      }, { status: 403 });
    }

    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔑 Admin client created');

    // Check if facility exists
    const { data: facility, error: facilityError } = await adminSupabase
      .from('facilities')
      .select('id, name')
      .eq('id', facilityId)
      .single();

    if (facilityError || !facility) {
      console.error('❌ Facility not found:', facilityError);
      return NextResponse.json({ 
        error: 'Facility not found' 
      }, { status: 404 });
    }

    console.log('✅ Facility found:', facility.name);

    // Check if facility already has an owner
    const { data: existingOwner } = await adminSupabase
      .from('facility_users')
      .select('id, user_id')
      .eq('facility_id', facilityId)
      .eq('is_owner', true)
      .eq('status', 'active')
      .single();

    if (existingOwner) {
      console.log('⚠️ Facility already has an owner');
      return NextResponse.json({ 
        error: 'Facility already has an owner' 
      }, { status: 409 });
    }

    // Generate password if not provided
    const ownerPassword = password || `${facility.name.replace(/\s+/g, '')}${new Date().getFullYear()}!`;

    console.log('👤 Creating facility owner auth user...');

    // Create auth user
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: ownerPassword,
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
        error: `Failed to create user account: ${authError.message}` 
      }, { status: 500 });
    }

    console.log('✅ Auth user created:', newUser.user.id);

    // Update the auto-created profile
    console.log('📋 Updating profile...');
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        facility_id: facilityId,
        role: 'facility',
        email: email,
        status: 'active'
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      // Clean up auth user
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ 
        error: `Failed to update user profile: ${profileError.message}` 
      }, { status: 500 });
    }

    console.log('✅ Profile updated');

    // Create facility_users entry with owner status
    console.log('🏢 Creating facility owner entry...');
    const { error: facilityUserError } = await adminSupabase
      .from('facility_users')
      .insert({
        facility_id: facilityId,
        user_id: newUser.user.id,
        role: 'super_admin',
        is_owner: true,
        invited_by: null, // System created
        status: 'active'
      });

    if (facilityUserError) {
      console.error('❌ Facility user error:', facilityUserError);
      // Don't fail completely - the profile was created successfully
      console.log('⚠️ User profile created but facility_users entry failed. User can still login.');
    } else {
      console.log('✅ Facility owner entry created');
    }

    console.log('🎉 Facility owner creation complete!');

    return NextResponse.json({ 
      success: true,
      message: 'Facility owner created successfully',
      owner: {
        userId: newUser.user.id,
        email: email,
        firstName: firstName,
        lastName: lastName,
        facilityId: facilityId,
        facilityName: facility.name,
        role: 'super_admin',
        isOwner: true
      },
      credentials: {
        email: email,
        password: ownerPassword
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}