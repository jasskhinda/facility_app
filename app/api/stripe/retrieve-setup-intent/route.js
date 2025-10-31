import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const { clientSecret, facilityId } = await request.json();

    if (!clientSecret || !facilityId) {
      return NextResponse.json(
        { error: 'Client secret and facility ID are required' },
        { status: 400 }
      );
    }

    // Get authorization - support both web (cookies) and mobile (Bearer token)
    const authHeader = request.headers.get('authorization');
    let supabase;
    let userId;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Mobile app authentication via Bearer token
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'You must be logged in' },
          { status: 401 }
        );
      }

      userId = user.id;
    } else {
      // Web app authentication via cookies
      supabase = await createRouteHandlerClient();

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.json(
          { error: 'You must be logged in' },
          { status: 401 }
        );
      }

      userId = session.user.id;
    }

    // Verify user has access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('facility_id, role')
      .eq('id', userId)
      .single();

    const allowedRoles = ['facility', 'super_admin'];
    if (profileError || profile.facility_id !== facilityId || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Access denied to this facility' },
        { status: 403 }
      );
    }

    // Extract the SetupIntent ID from the client secret
    const setupIntentId = clientSecret.split('_secret_')[0];

    console.log('Retrieving SetupIntent:', setupIntentId);

    // Retrieve the SetupIntent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    console.log('SetupIntent status:', setupIntent.status);
    console.log('Payment method ID:', setupIntent.payment_method);

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Setup intent has not succeeded yet' },
        { status: 400 }
      );
    }

    if (!setupIntent.payment_method) {
      return NextResponse.json(
        { error: 'No payment method found on setup intent' },
        { status: 404 }
      );
    }

    // Retrieve the payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method);

    console.log('Retrieved payment method:', paymentMethod.id, paymentMethod.type);

    return NextResponse.json({ paymentMethod });

  } catch (error) {
    console.error('Error retrieving setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve setup intent' },
      { status: 500 }
    );
  }
}
