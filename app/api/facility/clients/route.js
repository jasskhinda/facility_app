import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { createAdminClient } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// GET /api/facility/clients - Get all clients for the facility
export async function GET(request) {
  const supabase = await createRouteHandlerClient();
  
  try {
    console.log('GET /api/facility/clients - Starting...');
    
    // Get user session with debugging
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check:', { 
      hasSession: !!session, 
      sessionError: sessionError?.message,
      userEmail: session?.user?.email 
    });
    
    if (!session) {
      console.log('No session found - returning 401');
      return NextResponse.json({ 
        error: 'Unauthorized - No session found',
        debug: { sessionError: sessionError?.message }
      }, { status: 401 });
    }
    
    // Check if user is facility admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single();
      
    console.log('Profile check:', { 
      profile, 
      profileError: profileError?.message,
      userId: session.user.id 
    });
      
    if (profileError) {
      console.log('Profile error:', profileError);
      return NextResponse.json({ 
        error: `Profile error: ${profileError.message}`,
        debug: { userId: session.user.id, profileError }
      }, { status: 500 });
    }
    
    if (profile.role !== 'facility') {
      console.log('Access denied - user role:', profile.role);
      return NextResponse.json({ 
        error: 'Access denied - Invalid role',
        debug: { userRole: profile.role, required: 'facility' }
      }, { status: 403 });
    }
    
    if (!profile.facility_id) {
      console.log('No facility ID found for user');
      return NextResponse.json({ 
        error: 'No facility associated with this account',
        debug: { profile }
      }, { status: 400 });
    }
    
    // Get clients for this facility
    console.log('Fetching clients for facility:', profile.facility_id);
    
    let authClients = [];
    let managedClients = [];
    
    // Get authenticated clients
    try {
      const { data: authData, error: authError } = await supabase
        .from('profiles')
        .select('*')
        .eq('facility_id', profile.facility_id)
        .eq('role', 'client');
      
      if (!authError) {
        authClients = authData || [];
      }
      console.log('Auth clients:', { count: authClients.length });
    } catch (error) {
      console.log('Auth clients error:', error.message);
    }
    
    // Get managed clients
    const { data: managedData, error: managedError } = await supabase
      .from('facility_managed_clients')
      .select('*')
      .eq('facility_id', profile.facility_id);
    
    if (managedError) {
      console.error('Managed clients error:', managedError);
      
      if (managedError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table missing. Please run: node create-real-table.js YOUR_SERVICE_ROLE_KEY',
          details: 'The facility_managed_clients table needs to be created.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ error: managedError.message }, { status: 500 });
    }
    
    managedClients = managedData || [];
    console.log('Managed clients:', { count: managedClients.length });
    
    // Combine all clients
    const allClients = [
      ...authClients.map(client => ({ ...client, client_type: 'authenticated' })),
      ...managedClients.map(client => ({ ...client, client_type: 'managed' }))
    ];
    
    console.log('Total clients found:', allClients.length);
    
    return NextResponse.json({ clients: allClients });
  } catch (error) {
    console.error('Error getting clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facility/clients - Create a new client
export async function POST(request) {
  const supabase = await createRouteHandlerClient();
  
  try {
    console.log('POST /api/facility/clients - Starting...');
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session check:', !!session);
    
    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is facility admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single();
      
    console.log('Profile check:', { profile, profileError });
      
    if (profileError) {
      console.log('Profile error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    
    if (profile.role !== 'facility') {
      console.log('Access denied - user role:', profile.role);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (!profile.facility_id) {
      console.log('No facility ID found for user');
      return NextResponse.json({ error: 'No facility associated with this account' }, { status: 400 });
    }
    
    // Get client data from request
    const clientData = await request.json();
    console.log('Client data received:', clientData);
    
    // Validate required fields
    if (!clientData.first_name || !clientData.last_name || !clientData.email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    
    
    // Create client in facility_managed_clients table
    console.log('Creating managed client for:', clientData.email);
    
    const { data: newClient, error: insertError } = await supabase
      .from('facility_managed_clients')
      .insert([{
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone_number: clientData.phone_number || null,
        address: clientData.address || null,
        accessibility_needs: clientData.accessibility_needs || null,
        medical_requirements: clientData.medical_requirements || null,
        emergency_contact: clientData.emergency_contact || null,
        is_veteran: clientData.is_veteran || false,
        facility_id: profile.facility_id
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('Insert error:', insertError);
      
      // If table doesn't exist, provide clear instructions
      if (insertError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table missing. Please run: node create-real-table.js YOUR_SERVICE_ROLE_KEY',
          details: 'The facility_managed_clients table needs to be created.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ error: `Failed to create client: ${insertError.message}` }, { status: 500 });
    }
    
    console.log('✅ Client created successfully:', newClient);
    
    console.log('✅ Client created successfully:', newClient);
    
    return NextResponse.json({ 
      message: 'Client created successfully',
      client: newClient
    });
    
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}