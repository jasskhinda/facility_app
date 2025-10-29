import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { facility_id, month, amount } = await request.json();

    console.log('Confirm card payment request:', { facility_id, month, amount });

    if (!facility_id || !month || !amount) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get authorization token from header for mobile app or use cookies for web
    const authHeader = request.headers.get('authorization');
    let supabase;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Mobile app authentication via Bearer token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    } else {
      // Web app authentication via cookies
      supabase = await createRouteHandlerClient();
    }

    // Verify user authentication
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate invoice number
    const invoiceNumber = `CCT-${month.replace('-', '')}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Record payment
    const { error: paymentError } = await supabase
      .from('facility_invoice_payments')
      .insert({
        facility_id: facility_id,
        amount: amount / 100, // Convert from cents to dollars
        payment_method: 'credit_card',
        month: month,
        status: 'completed',
        payment_note: `Credit card payment via Stripe mobile app`,
        payment_date: new Date().toISOString()
      });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
    }

    // Check if invoice exists
    const { data: existingInvoice } = await supabase
      .from('facility_invoices')
      .select('id')
      .eq('facility_id', facility_id)
      .eq('month', month)
      .single();

    if (existingInvoice) {
      // Update existing invoice
      const { error: updateError } = await supabase
        .from('facility_invoices')
        .update({
          payment_status: 'PAID WITH CARD',
          payment_notes: 'Payment processed via Stripe mobile app'
        })
        .eq('id', existingInvoice.id);

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return Response.json(
          { error: 'Failed to update invoice' },
          { status: 500 }
        );
      }
    } else {
      // Create new invoice
      const { error: createError } = await supabase
        .from('facility_invoices')
        .insert({
          facility_id: facility_id,
          invoice_number: invoiceNumber,
          month: month,
          total_amount: amount / 100,
          payment_status: 'PAID WITH CARD',
          payment_notes: 'Payment processed via Stripe mobile app'
        });

      if (createError) {
        console.error('Error creating invoice:', createError);
        return Response.json(
          { error: 'Failed to create invoice' },
          { status: 500 }
        );
      }
    }

    return Response.json({
      success: true,
      message: 'Payment recorded successfully'
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    return Response.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
