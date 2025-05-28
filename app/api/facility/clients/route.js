import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// GET /api/facility/clients - Get all clients for the facility
export async function GET(request) {
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
    
    // Get clients for this facility
    const { data: clients, error: clientsError } = await supabase
      .from('profiles')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'client');
      
    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }
    
    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error getting clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facility/clients - Create a new client
export async function POST(request) {
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
    
    // Get client data from request
    const clientData = await request.json();
    
    // Validate required fields
    if (!clientData.first_name || !clientData.last_name) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }
    
    // For facility-managed clients without auth accounts, create a profile with a UUID
    // TODO: Implement proper auth user creation for clients with email accounts
    const clientId = uuidv4();
    
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: clientId,
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        phone_number: clientData.phone_number,
        address: clientData.address,
        accessibility_needs: clientData.accessibility_needs || null,
        medical_requirements: clientData.medical_requirements || null,
        emergency_contact: clientData.emergency_contact || null,
        facility_id: profile.facility_id,
        role: 'client'
      });
      
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Client created successfully', 
      id: clientId 
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}