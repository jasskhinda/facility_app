import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🔑 Change user password API called');
    
    const body = await request.json();
    const { userId, newPassword } = body;

    console.log('📝 Request data:', { userId });

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔑 Admin client created');

    // Update the user's password using admin privileges
    console.log('🔒 Updating password...');
    const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        password: newPassword
      }
    );

    if (passwordError) {
      console.error('❌ Password update error:', passwordError);
      return NextResponse.json({ 
        error: 'Failed to update password: ' + passwordError.message 
      }, { status: 500 });
    }

    console.log('✅ Password updated successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}