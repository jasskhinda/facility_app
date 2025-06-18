import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/facility/clients/[id] - Get a specific client
export async function GET(request, { params }) {
  const { id } = params;
  const supabase = await createRouteHandlerClient();
  
  console.log('🔍 GET /api/facility/clients/[id] - Client ID:', id);
  
  try {
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
    
    console.log('✅ User authorized. Facility ID:', profile.facility_id);
    
    // First try to find in authenticated clients (profiles table)
    let client = null;
    let clientType = null;
    
    console.log('🔍 Searching for client in profiles table...');
    const { data: authClient, error: authError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .eq('role', 'client')
      .single();
    
    if (authClient) {
      console.log('✅ Found authenticated client:', authClient.email);
      client = authClient;
      clientType = 'authenticated';
    } else {
      console.log('❌ Not found in profiles table, checking managed clients...');
      // If not found in profiles, try managed clients table
      const { data: managedClient, error: managedError } = await supabase
        .from('facility_managed_clients')
        .select('*')
        .eq('id', id)
        .eq('facility_id', profile.facility_id)
        .single();
      
      console.log('Managed client search result:', { managedClient, managedError });
      
      if (managedError) {
        if (managedError.code === 'PGRST116') {
          console.log('❌ Client not found in either table');
          return NextResponse.json({ 
            error: 'Client not found or not associated with your facility' 
          }, { status: 404 });
        }
        console.log('❌ Managed client search error:', managedError);
        return NextResponse.json({ error: managedError.message }, { status: 500 });
      }
      
      if (!managedClient) {
        console.log('❌ No managed client found');
        return NextResponse.json({ 
          error: 'Client not found or not associated with your facility' 
        }, { status: 404 });
      }
      
      console.log('✅ Found managed client:', managedClient.email);
      client = managedClient;
      clientType = 'managed';
    }
    
    // Get client's trips (only for authenticated clients with user accounts)
    let trips = [];
    if (clientType === 'authenticated') {
      console.log('🔍 Loading trips for authenticated client...');
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', id)
        .order('pickup_time', { ascending: false });
        
      if (!tripsError) {
        trips = tripsData || [];
        console.log('✅ Loaded', trips.length, 'trips');
      } else {
        console.log('⚠️ Trip loading error (non-fatal):', tripsError.message);
      }
    } else {
      console.log('ℹ️ Skipping trip loading for managed client');
    }
    
    console.log('✅ Returning client data. Type:', clientType);
    return NextResponse.json({ 
      client: { ...client, client_type: clientType }, 
      trips 
    });
  } catch (error) {
    console.error('Error getting client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/facility/clients/[id] - Update a client
export async function PUT(request, { params }) {
  const { id } = params;
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
    
    // First check if it's an authenticated client (profiles table)
    const { data: authClient } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .eq('role', 'client')
      .single();
    
    // Get client data from request
    const clientData = await request.json();
    
    // Validate required fields
    if (!clientData.first_name || !clientData.last_name) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }
    
    if (authClient) {
      // Update in profiles table
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
    }
    
    // Check if it's a managed client
    const { data: managedClient } = await supabase
      .from('facility_managed_clients')
      .select('id')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .single();
    
    if (managedClient) {
      // Update in facility_managed_clients table
      const { error: updateError } = await supabase
        .from('facility_managed_clients')
        .update({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          email: clientData.email,
          phone_number: clientData.phone_number,
          address: clientData.address,
          accessibility_needs: clientData.accessibility_needs || null,
          medical_requirements: clientData.medical_requirements || null,
          emergency_contact: clientData.emergency_contact || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      
      return NextResponse.json({ message: 'Client updated successfully' });
    }
    
    return NextResponse.json({ 
      error: 'Client not found or not associated with your facility' 
    }, { status: 404 });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/facility/clients/[id] - Remove a client from facility
export async function DELETE(request, { params }) {
  const { id } = params;
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
    
    // First check if it's an authenticated client (profiles table)
    const { data: authClient } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .eq('role', 'client')
      .single();
    
    if (authClient) {
      // For authenticated clients, just remove the facility association
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
    }
    
    // Check if it's a managed client
    const { data: managedClient } = await supabase
      .from('facility_managed_clients')
      .select('id')
      .eq('id', id)
      .eq('facility_id', profile.facility_id)
      .single();
    
    if (managedClient) {
      // For managed clients, delete the record completely
      const { error: deleteError } = await supabase
        .from('facility_managed_clients')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      
      return NextResponse.json({ message: 'Client deleted successfully' });
    }
    
    return NextResponse.json({ 
      error: 'Client not found or not associated with your facility' 
    }, { status: 404 });
  } catch (error) {
    console.error('Error removing client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}