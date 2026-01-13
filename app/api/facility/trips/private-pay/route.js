import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/facility/trips/private-pay - Process private payment for a single trip
export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { trip_id, facility_id, amount, payment_method_id } = await request.json();

    // Validate required fields
    if (!trip_id || !facility_id || !amount || !payment_method_id) {
      return NextResponse.json(
        { error: 'Missing required fields: trip_id, facility_id, amount, payment_method_id' },
        { status: 400 }
      );
    }

    // Verify the trip exists and belongs to this facility
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, facility_id, price, status, is_private_pay')
      .eq('id', trip_id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    if (trip.facility_id !== facility_id) {
      return NextResponse.json(
        { error: 'Trip does not belong to this facility' },
        { status: 403 }
      );
    }

    if (trip.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed trips can be paid privately' },
        { status: 400 }
      );
    }

    if (trip.is_private_pay) {
      return NextResponse.json(
        { error: 'This trip has already been paid privately' },
        { status: 400 }
      );
    }

    // Get facility's Stripe customer ID
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('stripe_customer_id, name')
      .eq('id', facility_id)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    let stripeCustomerId = facility.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: facility.name,
        metadata: {
          facility_id: facility_id
        }
      });
      stripeCustomerId = customer.id;

      // Save customer ID to facility
      await supabase
        .from('facilities')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', facility_id);
    }

    // Create payment intent
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: payment_method_id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        trip_id: trip_id,
        facility_id: facility_id,
        payment_type: 'private_pay'
      },
      description: `Private pay for trip ${trip_id.substring(0, 8)}`
    });

    // Check if payment requires additional action (3D Secure)
    if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({
        success: true,
        requires_action: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      });
    }

    // Payment succeeded, update trip
    if (paymentIntent.status === 'succeeded') {
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          is_private_pay: true,
          private_pay_date: new Date().toISOString(),
          private_pay_amount: amount,
          private_pay_stripe_id: paymentIntent.id,
          private_pay_method: 'card'
        })
        .eq('id', trip_id);

      if (updateError) {
        console.error('Error updating trip:', updateError);
        // Payment succeeded but trip update failed - log for manual reconciliation
        return NextResponse.json({
          success: true,
          warning: 'Payment processed but trip update failed. Please contact support.',
          payment_intent_id: paymentIntent.id
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Payment successful',
        payment_intent_id: paymentIntent.id
      });
    }

    // Payment failed
    return NextResponse.json(
      { error: `Payment failed with status: ${paymentIntent.status}` },
      { status: 400 }
    );

  } catch (error) {
    console.error('Private pay error:', error);

    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
