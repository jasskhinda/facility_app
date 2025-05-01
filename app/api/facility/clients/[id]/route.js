import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/facility/clients/[id] - Get a specific client
export async function GET(request, { params }) {
  const { id } = params;
  const supabase = createRouteHandlerClient({ cookies });
  
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
    
    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .single();
      
    if (clientError) {
      if (clientError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      return NextResponse.json({ error: clientError.message }, { status: 500 });
    }
    
    // Get client's trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', id)
      .order('pickup_time', { ascending: false });
      
    if (tripsError) {
      return NextResponse.json({ error: tripsError.message }, { status: 500 });
    }
    
    return NextResponse.json({ client, trips });
  } catch (error) {
    console.error('Error getting client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/facility/clients/[id] - Update a client
export async function PUT(request, { params }) {
  const { id } = params;
  const supabase = createRouteHandlerClient({ cookies });
  
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
    
    // Check if client belongs to this facility
    const { data: clientCheck, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .single();
      
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found or not associated with your facility' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    // Get client data from request
    const clientData = await request.json();
    
    // Update client profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        phone_number: clientData.phone_number,
        address: clientData.address,
        accessibility_needs: clientData.accessibility_needs || null,
        medical_requirements: clientData.medical_requirements || null,
        emergency_contact: clientData.emergency_contact || null,
      })
      .eq('id', id);
      
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/facility/clients/[id] - Remove a client from facility
export async function DELETE(request, { params }) {
  const { id } = params;
  const supabase = createRouteHandlerClient({ cookies });
  
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
    
    // Check if client belongs to this facility
    const { data: clientCheck, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .single();
      
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found or not associated with your facility' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    // In a real implementation, you would determine whether to:
    // 1. Remove the facility_id from the client (disassociate)
    // 2. Delete the client completely
    // 3. Archive the client
    
    // For this demo, we'll just remove the facility association
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        facility_id: null
      })
      .eq('id', id);
      
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Client removed from facility' });
  } catch (error) {
    console.error('Error removing client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}