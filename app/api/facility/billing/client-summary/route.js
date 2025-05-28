import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/facility/billing/client-summary - Get billing summary by client
export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });
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
    
    // Get filters
    const clientId = searchParams.get('client_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Build base query for invoices for facility clients
    let invoicesQuery = supabase
      .from('invoices')
      .select(`
        id,
        user_id,
        amount,
        total,
        status,
        created_at,
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
          pickup_time,
          distance
        )
      `)
      .eq('profiles.facility_id', profile.facility_id)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (clientId) {
      invoicesQuery = invoicesQuery.eq('user_id', clientId);
    }
    
    if (startDate) {
      invoicesQuery = invoicesQuery.gte('created_at', startDate);
    }
    
    if (endDate) {
      // Add one day to include the entire end date
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      invoicesQuery = invoicesQuery.lt('created_at', endDateTime.toISOString());
    }
    
    const { data: invoices, error: invoicesError } = await invoicesQuery;
    
    if (invoicesError) {
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }
    
    // Group invoices by client
    const clientSummary = {};
    let totalAmount = 0;
    let totalInvoices = 0;
    
    invoices.forEach(invoice => {
      const clientId = invoice.user_id;
      if (!clientSummary[clientId]) {
        clientSummary[clientId] = {
          client: invoice.profiles,
          invoice_count: 0,
          total_amount: 0,
          invoices: []
        };
      }
      
      const amount = parseFloat(invoice.total || 0);
      clientSummary[clientId].invoice_count += 1;
      clientSummary[clientId].total_amount += amount;
      clientSummary[clientId].invoices.push({
        id: invoice.id,
        amount: invoice.amount,
        total: invoice.total,
        status: invoice.status,
        created_at: invoice.created_at,
        trip: invoice.trips
      });
      
      totalAmount += amount;
      totalInvoices += 1;
    });
    
    // Convert to array and sort by total amount
    const clientSummaryArray = Object.values(clientSummary)
      .sort((a, b) => b.total_amount - a.total_amount);
    
    // Get list of all clients for filtering
    const { data: allClients, error: clientsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'client')
      .order('first_name');
    
    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      summary: {
        total_clients: clientSummaryArray.length,
        total_invoices: totalInvoices,
        total_amount: totalAmount,
        average_invoice_amount: totalInvoices > 0 ? totalAmount / totalInvoices : 0
      },
      clients: clientSummaryArray,
      allClients: allClients || []
    });
  } catch (error) {
    console.error('Error getting client billing summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}