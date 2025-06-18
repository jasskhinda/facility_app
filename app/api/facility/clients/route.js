import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { createAdminClient } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    
    // Get client data from request
    const clientData = await request.json();
    
    // Validate required fields
    if (!clientData.first_name || !clientData.last_name || !clientData.email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    
    // Create a client profile using Supabase Auth if email is provided, otherwise use a managed approach
    let clientId;
    let insertError;
    
    if (clientData.email && clientData.email.trim()) {
      // Create a user account for clients with email addresses using admin client
      const adminSupabase = createAdminClient();
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'; // Generate temp password
      
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: clientData.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          role: 'client',
          facility_id: profile.facility_id,
          created_by_facility: true
        }
      });
      
      if (authError) {
        return NextResponse.json({ error: `Failed to create user account: ${authError.message}` }, { status: 500 });
      }
      
      clientId = authData.user.id;
      
      // The profile will be created automatically by the handle_new_user trigger
      // But we need to update it with additional facility information
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
      // For clients without email accounts, we need a different approach
      // Since we can't create profiles without auth users, we'll return an error for now
      return NextResponse.json({ 
        error: 'Email address is required to create client accounts. Please provide an email address.' 
      }, { status: 400 });
    }
    
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
      
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