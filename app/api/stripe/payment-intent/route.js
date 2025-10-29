import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { facilityId, amount, month, metadata = {} } = body;

    // Check if Stripe is properly initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Get the user session
    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to create a payment intent' },
        { status: 401 }
      );
    }

    // Verify user has access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('facility_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile.facility_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user is facility staff
    const facilityStaffRoles = ['facility', 'super_admin', 'admin', 'scheduler'];
    if (!facilityStaffRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Access denied - Invalid role' },
        { status: 403 }
      );
    }

    if (profile.facility_id !== facilityId) {
      return NextResponse.json(
        { error: 'Access denied to this facility' },
        { status: 403 }
      );
    }

    // Get facility information
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name, stripe_customer_id')
      .eq('id', facilityId)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    let customerId = facility.stripe_customer_id;

    // Create Stripe customer if it doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: facility.name,
        metadata: {
          facility_id: facilityId,
          type: 'facility'
        }
      });

      customerId = customer.id;

      // Update facility with Stripe customer ID
      await supabase
        .from('facilities')
        .update({ stripe_customer_id: customerId })
        .eq('id', facilityId);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        facility_id: facilityId,
        month: month,
        created_by: session.user.id,
        ...metadata
      }
    });

    // Also create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    );

    return NextResponse.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
