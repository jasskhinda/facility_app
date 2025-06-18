import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/facility/billing - Get all invoices for the facility
export async function GET(request) {
  const supabase = createRouteHandlerClient();
  const { searchParams } = new URL(request.url);
  
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
    
    // Build query for invoices for facility clients
    let query = supabase
      .from('invoices')
      .select(`
        *,
        profiles!user_id (
          id,
          first_name,
          last_name,
          facility_id
        ),
        trips (
          id,
          pickup_address,
          destination_address,
          pickup_time
        )
      `)
      .eq('profiles.facility_id', profile.facility_id)
      .order('created_at', { ascending: false });
    
    // Apply filters
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }
    
    const year = searchParams.get('year');
    if (year) {
      query = query
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${parseInt(year) + 1}-01-01`);
    }
    
    const month = searchParams.get('month');
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query = query
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
    }
    
    const { data: invoices, error: invoicesError } = await query;
    
    if (invoicesError) {
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }
    
    // Calculate summary statistics
    const summary = {
      total_invoices: invoices.length,
      total_amount: invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
      paid_amount: invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
      outstanding_amount: invoices
        .filter(inv => ['pending', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
      overdue_count: invoices.filter(inv => inv.status === 'overdue').length
    };
    
    return NextResponse.json({ invoices, summary });
  } catch (error) {
    console.error('Error getting billing data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facility/billing - Create invoice for a trip
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
    
    const { trip_id, amount, tax = 0 } = await request.json();
    
    // Validate input
    if (!trip_id || !amount) {
      return NextResponse.json({ error: 'Trip ID and amount are required' }, { status: 400 });
    }
    
    // Verify the trip belongs to a client of this facility
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        user_id,
        profiles!user_id (
          facility_id
        )
      `)
      .eq('id', trip_id)
      .single();
    
    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    
    if (trip.profiles.facility_id !== profile.facility_id) {
      return NextResponse.json({ error: 'Trip does not belong to your facility' }, { status: 403 });
    }
    
    // Call stored procedure to create invoice
    const { data: invoiceId, error } = await supabase.rpc('create_trip_invoice', {
      p_trip_id: trip_id,
      p_amount: amount,
      p_tax: tax
    });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Fetch the created invoice with details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        profiles!user_id (
          id,
          first_name,
          last_name
        ),
        trips (
          id,
          pickup_address,
          destination_address,
          pickup_time
        )
      `)
      .eq('id', invoiceId)
      .single();
    
    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }
    
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}