import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🗑️ Delete user API called');
    
    const body = await request.json();
    const { facilityId, userId } = body;

    console.log('📝 Request data:', { facilityId, userId });

    if (!facilityId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔑 Admin client created');

    // Check if user is a facility owner (prevent deletion of owners)
    console.log('🔍 Checking if user is facility owner...');
    const { data: facilityUser, error: facilityUserError } = await adminSupabase
      .from('facility_users')
      .select('is_owner, role')
      .eq('facility_id', facilityId)
      .eq('user_id', userId)
      .single();

    if (facilityUserError) {
      console.error('❌ Error checking facility user:', facilityUserError);
      return NextResponse.json({ 
        error: 'User not found in facility' 
      }, { status: 404 });
    }

    if (facilityUser.is_owner) {
      console.log('❌ Attempted to delete facility owner');
      return NextResponse.json({ 
        error: 'Cannot delete facility owner' 
      }, { status: 403 });
    }

    console.log('✅ User can be deleted');

    // Remove from facility_users table first
    console.log('🏢 Removing from facility_users...');
    const { error: facilityUserDeleteError } = await adminSupabase
      .from('facility_users')
      .delete()
      .eq('facility_id', facilityId)
      .eq('user_id', userId);

    if (facilityUserDeleteError) {
      console.error('❌ Facility user deletion error:', facilityUserDeleteError);
      return NextResponse.json({ 
        error: 'Failed to remove user from facility: ' + facilityUserDeleteError.message 
      }, { status: 500 });
    }

    console.log('✅ Removed from facility_users table');

    // Update profile to mark as inactive and remove facility association
    console.log('📋 Updating profile...');
    const { error: profileUpdateError } = await adminSupabase
      .from('profiles')
      .update({
        facility_id: null,
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('❌ Profile update error:', profileUpdateError);
      // Continue with auth deletion even if profile update fails
      console.log('⚠️ Profile update failed but continuing with user deletion');
    } else {
      console.log('✅ Profile updated');
    }

    // Delete the user from Supabase Auth
    console.log('👤 Deleting from auth...');
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('❌ Auth deletion error:', authDeleteError);
      return NextResponse.json({ 
        error: 'Failed to delete user account: ' + authDeleteError.message 
      }, { status: 500 });
    }

    console.log('✅ User deleted from auth');
    console.log('🎉 User deletion complete!');

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}