import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/facility/trips/private-pay-intent - Create payment intent for private pay (mobile app)
export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { trip_id, facility_id, amount } = await request.json();

    // Validate required fields
    if (!trip_id || !facility_id || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: trip_id, facility_id, amount' },
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

    // Create payment intent (without confirming - mobile will present payment sheet)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        trip_id: trip_id,
        facility_id: facility_id,
        payment_type: 'private_pay'
      },
      description: `Private pay for trip ${trip_id.substring(0, 8)}`
    });

    // Create ephemeral key for mobile SDK
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: stripeCustomerId },
      { apiVersion: '2023-10-16' }
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      ephemeralKey: ephemeralKey.secret,
      customerId: stripeCustomerId
    });

  } catch (error) {
    console.error('Private pay intent error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
