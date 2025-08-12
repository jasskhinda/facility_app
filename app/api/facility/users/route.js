import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');

    if (!facilityId) {
      return NextResponse.json({ error: 'Facility ID is required' }, { status: 400 });
    }

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view facility users
    const { data: userRole } = await supabase
      .from('facility_users')
      .select('role')
      .eq('facility_id', facilityId)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (!userRole || !['super_admin', 'admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get facility users with profile information
    const { data: facilityUsers, error } = await supabase
      .from('facility_users')
      .select(`
        id,
        user_id,
        role,
        status,
        invited_at,
        invited_by,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('facility_id', facilityId)
      .order('invited_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ users: facilityUsers });
  } catch (error) {
    console.error('Error fetching facility users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const body = await request.json();
    const { facilityId, email, password, firstName, lastName, role } = body;

    if (!facilityId || !email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Get current user session
    console.log('POST: Getting session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('POST: Session result:', { session: !!session, sessionError, userId: session?.user?.id });
    
    if (!session) {
      console.log('POST: No session found, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create users (check both new and old system)
    let hasPermission = false;
    let userFacilityId = null;
    
    console.log('Checking permissions for user:', session.user.id, 'facility:', facilityId);
    
    // Check new facility_users table first
    const { data: facilityUser, error: facilityUserError } = await supabase
      .from('facility_users')
      .select('role, facility_id')
      .eq('facility_id', facilityId)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    console.log('Facility user check:', { facilityUser, facilityUserError });

    if (facilityUser && facilityUser.role === 'super_admin') {
      hasPermission = true;
      userFacilityId = facilityUser.facility_id;
      console.log('Permission granted via facility_users table');
    } else {
      // Fallback to profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, facility_id')
        .eq('id', session.user.id)
        .single();
      
      console.log('Profile check:', { profile, profileError });
      
      if (profile && profile.role === 'facility' && profile.facility_id === facilityId) {
        hasPermission = true;
        userFacilityId = profile.facility_id;
        console.log('Permission granted via profiles table');
      }
    }

    console.log('Final permission check:', { hasPermission, userFacilityId });

    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to create users',
        debug: {
          userId: session.user.id,
          facilityId,
          facilityUser,
          facilityUserError: facilityUserError?.message
        }
      }, { status: 403 });
    }

    // Create admin client for user creation
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create the user in Supabase Auth
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
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        error: authError.message || 'Failed to create user account' 
      }, { status: 400 });
    }

    // Create profile for the new user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        facility_id: facilityId,
        role: 'facility'
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Try to clean up the auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    // Add to facility_users table with the specified role
    const { error: facilityUserInsertError } = await supabase
      .from('facility_users')
      .insert({
        facility_id: facilityId,
        user_id: newUser.user.id,
        role: role,
        invited_by: session.user.id,
        status: 'active'
      });

    if (facilityUserInsertError) {
      console.error('Facility user error:', facilityUserInsertError);
      // Clean up on error
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      await supabase.from('profiles').delete().eq('id', newUser.user.id);
      return NextResponse.json({ error: 'Failed to assign user role' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      userId: newUser.user.id 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { facilityId, userId, role, action } = body;

    if (!facilityId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: currentUserRole } = await supabase
      .from('facility_users')
      .select('role')
      .eq('facility_id', facilityId)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (!currentUserRole) {
      return NextResponse.json({ error: 'User not found in facility' }, { status: 403 });
    }

    // Get target user's current role
    const { data: targetUser } = await supabase
      .from('facility_users')
      .select('role')
      .eq('facility_id', facilityId)
      .eq('user_id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Permission checks based on action
    if (action === 'update_role') {
      if (!role) {
        return NextResponse.json({ error: 'Role is required for update' }, { status: 400 });
      }

      // Super admins can update anyone, admins can only update schedulers
      const canUpdate = currentUserRole.role === 'super_admin' || 
                       (currentUserRole.role === 'admin' && targetUser.role === 'scheduler');

      if (!canUpdate) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const { error } = await supabase
        .from('facility_users')
        .update({ role })
        .eq('facility_id', facilityId)
        .eq('user_id', userId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'User role updated successfully' });
    }

    if (action === 'remove') {
      // Super admins can remove anyone, admins can only remove schedulers
      const canRemove = currentUserRole.role === 'super_admin' || 
                       (currentUserRole.role === 'admin' && targetUser.role === 'scheduler');

      if (!canRemove) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Don't allow removing yourself
      if (userId === session.user.id) {
        return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
      }

      const { error } = await supabase
        .from('facility_users')
        .delete()
        .eq('facility_id', facilityId)
        .eq('user_id', userId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'User removed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}