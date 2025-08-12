import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🔄 Update user role API called');
    
    const body = await request.json();
    const { facilityId, userId, newRole, currentUserRole } = body;

    console.log('📝 Request data:', { facilityId, userId, newRole, currentUserRole });

    if (!facilityId || !userId || !newRole) {
      return NextResponse.json({ 
        error: 'Missing required fields: facilityId, userId, newRole' 
      }, { status: 400 });
    }

    // Validate role
    if (!['super_admin', 'admin', 'scheduler'].includes(newRole)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be super_admin, admin, or scheduler' 
      }, { status: 400 });
    }

    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔑 Admin client created');

    // Check if the user being updated is an owner
    const { data: targetUser, error: targetUserError } = await adminSupabase
      .from('facility_users')
      .select('is_owner, role')
      .eq('facility_id', facilityId)
      .eq('user_id', userId)
      .single();

    if (targetUserError) {
      console.error('❌ Target user not found:', targetUserError);
      return NextResponse.json({ 
        error: 'User not found in facility' 
      }, { status: 404 });
    }

    // Prevent changing owner's role
    if (targetUser.is_owner) {
      console.log('🛡️ Attempted to change owner role - blocked');
      return NextResponse.json({ 
        error: 'Cannot change facility owner role. Owner must always remain Super Admin.' 
      }, { status: 403 });
    }

    console.log('✅ Target user found, not an owner');

    // Update the role
    const { error: updateError } = await adminSupabase
      .from('facility_users')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('facility_id', facilityId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json({ 
        error: `Failed to update user role: ${updateError.message}` 
      }, { status: 500 });
    }

    console.log('✅ User role updated successfully');

    // Get updated user info for response
    const { data: updatedUser } = await adminSupabase
      .from('facility_users')
      .select(`
        *,
        profiles(first_name, last_name, email)
      `)
      .eq('facility_id', facilityId)
      .eq('user_id', userId)
      .single();

    return NextResponse.json({ 
      success: true,
      message: `User role updated to ${newRole}`,
      user: updatedUser
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}