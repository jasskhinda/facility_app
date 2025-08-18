import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🚀 Update user API called');
    
    const body = await request.json();
    const { facilityId, userId, email, firstName, lastName, phoneNumber, role } = body;

    console.log('📝 Request data:', { facilityId, userId, email, firstName, lastName, phoneNumber, role });

    if (!facilityId || !userId || !email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔑 Admin client created');

    // Update the user's profile
    console.log('📋 Updating profile...');
    
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null,
        email: email,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('❌ Profile update error:', profileError);
      return NextResponse.json({ error: 'Failed to update user profile: ' + profileError.message }, { status: 500 });
    }

    console.log('✅ Profile updated');

    // Update the user's role in facility_users table if provided
    if (role) {
      console.log('🏢 Updating facility role...');
      const { error: facilityUserError } = await adminSupabase
        .from('facility_users')
        .update({
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('facility_id', facilityId)
        .eq('user_id', userId);

      if (facilityUserError) {
        console.error('❌ Facility user role update error:', facilityUserError);
        // Don't fail completely - the profile was updated successfully
        console.log('⚠️ Profile updated but role update failed.');
      } else {
        console.log('✅ Facility role updated');
      }
    }

    // Update the user's email in auth if it changed
    console.log('👤 Updating auth email...');
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        email: email,
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        }
      }
    );

    if (authError) {
      console.error('❌ Auth email update error:', authError);
      // Don't fail completely - the profile was updated successfully
      console.log('⚠️ Profile updated but auth email update failed.');
    } else {
      console.log('✅ Auth email updated');
    }

    console.log('🎉 User update complete!');

    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}