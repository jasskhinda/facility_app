import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Debug - Session:', !!session, sessionError);
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No session found',
        error: sessionError?.message
      });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    console.log('Debug - Profile:', profile, profileError);
    
    return NextResponse.json({
      authenticated: true,
      session: {
        user_id: session.user.id,
        email: session.user.email
      },
      profile: profile,
      profileError: profileError?.message
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
