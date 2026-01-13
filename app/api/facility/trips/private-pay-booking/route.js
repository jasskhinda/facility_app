import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/facility/trips/private-pay-booking - Create payment intent for private pay at booking time
export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { facility_id, amount } = await request.json();

    // Validate required fields
    if (!facility_id || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: facility_id, amount' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
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
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        facility_id: facility_id,
        payment_type: 'private_pay_booking'
      },
      description: `Private pay trip booking`
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: stripeCustomerId
    });

  } catch (error) {
    console.error('Private pay booking error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
