import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/facility/admins - Get facility admins
export async function GET(request) {
  const supabase = createRouteHandlerClient();
  
  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is facility admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    
    if (profile.role !== 'facility') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (!profile.facility_id) {
      return NextResponse.json({ error: 'No facility associated with this account' }, { status: 400 });
    }
    
    // Get facility administrators
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'facility');
      
    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 });
    }
    
    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Error getting facility admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facility/admins/invite - Invite a new admin
export async function POST(request) {
  const supabase = createRouteHandlerClient();
  
  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is facility admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    
    if (profile.role !== 'facility') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (!profile.facility_id) {
      return NextResponse.json({ error: 'No facility associated with this account' }, { status: 400 });
    }
    
    // Get invite data from request
    const { email, first_name, last_name } = await request.json();
    
    // Validate required fields
    if (!email || !first_name || !last_name) {
      return NextResponse.json({ error: 'Email, first name, and last name are required' }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    // In a real implementation, you would:
    // 1. Create a user with the Supabase admin API or send an invitation
    // 2. When the user signs up, attach the facility_id and role in metadata
    
    // For this demo, we'll just return a success message
    // since we can't directly create auth users without the admin API
    
    return NextResponse.json({ 
      message: 'Invitation sent successfully',
      note: 'In a real implementation, this would create a user and send an email invitation'
    });
  } catch (error) {
    console.error('Error inviting admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}