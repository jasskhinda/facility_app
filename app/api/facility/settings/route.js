import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/facility/settings - Get facility settings
export async function GET(request) {
  const supabase = await createRouteHandlerClient();
  
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
    
    // Get facility data
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', profile.facility_id)
      .single();
      
    if (facilityError) {
      return NextResponse.json({ error: facilityError.message }, { status: 500 });
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
    
    return NextResponse.json({ facility, admins });
  } catch (error) {
    console.error('Error getting facility settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/facility/settings - Update facility settings
export async function PUT(request) {
  const supabase = await createRouteHandlerClient();
  
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
    
    // Get facility data from request
    const facilityData = await request.json();
    
    // Validate required fields
    if (!facilityData.name || !facilityData.address || !facilityData.phone_number || !facilityData.contact_email) {
      return NextResponse.json({ error: 'Name, address, phone number, and contact email are required' }, { status: 400 });
    }
    
    // Update facility
    const { error: updateError } = await supabase
      .from('facilities')
      .update({
        name: facilityData.name,
        address: facilityData.address,
        phone_number: facilityData.phone_number,
        contact_email: facilityData.contact_email,
        billing_email: facilityData.billing_email,
        facility_type: facilityData.facility_type,
      })
      .eq('id', profile.facility_id);
      
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Facility settings updated successfully' });
  } catch (error) {
    console.error('Error updating facility settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}