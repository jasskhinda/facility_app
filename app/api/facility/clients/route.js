import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { createAdminClient } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// GET /api/facility/clients - Get all clients for the facility
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
    
    // Get clients for this facility - include both authenticated and managed clients
    const { data: authClients, error: authClientsError } = await supabase
      .from('profiles')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'client');
      
    const { data: managedClients, error: managedClientsError } = await supabase
      .from('facility_managed_clients')
      .select('*')
      .eq('facility_id', profile.facility_id);
      
    if (authClientsError && authClientsError.code !== 'PGRST116') {
      return NextResponse.json({ error: authClientsError.message }, { status: 500 });
    }
    
    if (managedClientsError && managedClientsError.code !== 'PGRST116') {
      return NextResponse.json({ error: managedClientsError.message }, { status: 500 });
    }
    
    // Combine both types of clients, marking the source
    const allClients = [
      ...(authClients || []).map(client => ({ ...client, client_type: 'authenticated' })),
      ...(managedClients || []).map(client => ({ ...client, client_type: 'managed', role: 'client' }))
    ];
    
    return NextResponse.json({ clients: allClients });
  } catch (error) {
    console.error('Error getting clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facility/clients - Create a new client
export async function POST(request) {
  const supabase = createRouteHandlerClient();
  
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
      console.log('No facility_id found for user');
      return NextResponse.json({ error: 'No facility associated with this account' }, { status: 400 });
    }
    
    // Get client data from request
    const clientData = await request.json();
    console.log('Client data received:', clientData);
    
    // Validate required fields
    if (!clientData.first_name || !clientData.last_name || !clientData.email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    
    // Create a client profile using Supabase Auth if email is provided, otherwise use a managed approach
    let clientId;
    let insertError;
    
    // For development/testing: Use facility_managed_clients table
    // In production with proper credentials, this would create authenticated users
    
    console.log('Creating managed client for:', clientData.email);
    
    // Check if we have real credentials (not placeholder)
    const hasRealCredentials = process.env.SUPABASE_SERVICE_ROLE_KEY && 
                               !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder');
    
    if (hasRealCredentials) {
      // Use admin client to create proper auth user
      const adminSupabase = createAdminClient();
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      
      console.log('Creating auth user with admin client...');
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: clientData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          role: 'client',
          facility_id: profile.facility_id,
          created_by_facility: true
        }
      });
      
      if (authError) {
        console.error('Auth creation error:', authError);
        return NextResponse.json({ error: `Failed to create user account: ${authError.message}` }, { status: 500 });
      }
      
      clientId = authData.user.id;
      console.log('Auth user created:', clientId);
      
      // Wait for trigger to create profile, then update it
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone_number: clientData.phone_number,
          address: clientData.address,
          accessibility_needs: clientData.accessibility_needs || null,
          medical_requirements: clientData.medical_requirements || null,
          emergency_contact: clientData.emergency_contact || null,
          facility_id: profile.facility_id
        })
        .eq('id', clientId);
        
      insertError = updateError;
    } else {
      // Development mode: Use facility_managed_clients table
      console.log('Development mode: Creating managed client');
      
      const { data: insertData, error: insertProfileError } = await supabase
        .from('facility_managed_clients')
        .insert({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          email: clientData.email,
          phone_number: clientData.phone_number,
          address: clientData.address,
          accessibility_needs: clientData.accessibility_needs || null,
          medical_requirements: clientData.medical_requirements || null,
          emergency_contact: clientData.emergency_contact || null,
          facility_id: profile.facility_id
        })
        .select()
        .single();
        
      if (insertProfileError) {
        console.error('Managed client creation error:', insertProfileError);
        return NextResponse.json({ error: insertProfileError.message }, { status: 500 });
      }
      
      clientId = insertData.id;
      insertError = null;
      console.log('Managed client created:', clientId);
    }
    
    if (insertError) {
      console.error('Profile update error:', insertError);
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