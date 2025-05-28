import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/facility/billing/[id] - Get a specific invoice with details
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
    
    // Get invoice with all details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        profiles!user_id (
          id,
          first_name,
          last_name,
          phone_number,
          facility_id
        ),
        trips (
          id,
          pickup_address,
          destination_address,
          pickup_time,
          driver_name,
          distance,
          special_requirements,
          facility_id
        )
      `)
      .eq('id', id)
      .single();
    
    // Verify the invoice belongs to a client of this facility
    if (!invoice || invoice.profiles?.facility_id !== profile.facility_id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
      
    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }
    
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error getting invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/facility/billing/[id] - Update invoice status
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
    
    // Check if invoice belongs to this facility
    const { data: invoiceCheck, error: checkError } = await supabase
      .from('invoices')
      .select(`
        id,
        profiles!user_id (
          facility_id
        )
      `)
      .eq('id', id)
      .single();
      
    if (checkError || !invoiceCheck || invoiceCheck.profiles?.facility_id !== profile.facility_id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    const { status, paid_date, payment_method, notes } = await request.json();
    
    // Validate status
    const validStatuses = ['pending', 'paid', 'overdue', 'cancelled', 'refunded'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    // Build update object
    const updateData = {};
    if (status) updateData.status = status;
    if (paid_date !== undefined) updateData.paid_date = paid_date;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (notes !== undefined) updateData.notes = notes;
    
    // Update invoice
    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);
      
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}