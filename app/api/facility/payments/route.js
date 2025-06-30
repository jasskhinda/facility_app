import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      facilityId, 
      month, 
      amount, 
      paymentMethod, 
      paymentMethodId = null,
      invoiceNumber,
      tripIds = []
    } = body;

    if (!facilityId || !month || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('facility_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError || profile.facility_id !== facilityId || profile.role !== 'facility') {
      return NextResponse.json(
        { error: 'Access denied to this facility' },
        { status: 403 }
      );
    }

    let paymentData = {
      facility_id: facilityId,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      month: month,
      trip_ids: tripIds,
      payment_date: new Date().toISOString(),
      status: 'completed'
    };

    let invoiceStatus = 'UNPAID';
    let responseMessage = '';

    // Handle different payment methods
    switch (paymentMethod) {
      case 'credit_card':
      case 'saved_card':
        if (!stripe) {
          return NextResponse.json(
            { error: 'Payment processing not available' },
            { status: 500 }
          );
        }

        // For saved cards, use the saved payment method
        if (paymentMethod === 'saved_card' && paymentMethodId) {
          // Get the payment method details
          const { data: savedMethod, error: methodError } = await supabase
            .from('facility_payment_methods')
            .select('*')
            .eq('id', paymentMethodId)
            .eq('facility_id', facilityId)
            .single();

          if (methodError || !savedMethod) {
            return NextResponse.json(
              { error: 'Payment method not found' },
              { status: 404 }
            );
          }

          // Create payment intent with saved payment method
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            customer: savedMethod.stripe_customer_id,
            payment_method: savedMethod.stripe_payment_method_id,
            confirm: true,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing`,
            metadata: {
              facility_id: facilityId,
              month: month,
              invoice_number: invoiceNumber || `INV-${month}-${facilityId.slice(-8)}`
            }
          });

          paymentData.stripe_payment_intent_id = paymentIntent.id;
          paymentData.card_last_four = savedMethod.last_four;
          paymentData.payment_method_id = paymentMethodId;
        }

        invoiceStatus = 'PAID WITH CARD';
        responseMessage = `Payment of $${amount} processed successfully with credit card`;
        break;

      case 'bank_transfer':
        // For ACH transfers, the status is just "PAID" and processing takes time
        invoiceStatus = 'PAID';
        responseMessage = `Bank transfer initiated for $${amount}. Processing time: 1-3 business days`;
        break;

      case 'check_submit':
        invoiceStatus = 'PROCESSING PAYMENT';
        responseMessage = 'Check payment request submitted. Please mail your check to our office address.';
        break;

      case 'check_sent':
        invoiceStatus = 'PROCESSING PAYMENT';
        responseMessage = 'Check payment marked as sent. Awaiting verification by our dispatch team.';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
    }

    // Save payment record
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('facility_invoice_payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record creation error:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Update or create invoice record
    const { error: invoiceError } = await supabase
      .from('facility_invoices')
      .upsert({
        facility_id: facilityId,
        invoice_number: invoiceNumber || `INV-${month}-${facilityId.slice(-8)}`,
        month: month,
        total_amount: parseFloat(amount),
        total_trips: tripIds.length,
        payment_status: invoiceStatus,
        trip_ids: tripIds,
        last_updated: new Date().toISOString()
      });

    if (invoiceError) {
      console.error('Invoice update error:', invoiceError);
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      paymentId: paymentRecord.id,
      invoiceStatus: invoiceStatus
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve payment history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    const month = searchParams.get('month');

    if (!facilityId) {
      return NextResponse.json(
        { error: 'Facility ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to this facility or is a dispatcher/admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('facility_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to verify user access' },
        { status: 500 }
      );
    }

    const hasAccess = 
      (profile.role === 'facility' && profile.facility_id === facilityId) ||
      ['dispatcher', 'admin'].includes(profile.role);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('facility_invoice_payments')
      .select('*')
      .eq('facility_id', facilityId)
      .order('payment_date', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Payment history fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payments: payments || []
    });

  } catch (error) {
    console.error('Payment history retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment history' },
      { status: 500 }
    );
  }
}