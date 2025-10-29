import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request) {
  try {
    const { facility_id, amount, month } = await request.json();

    console.log('Create payment intent request:', { facility_id, amount, month });

    if (!facility_id || !amount || !month) {
      return Response.json(
        { error: 'Missing required fields: facility_id, amount, month' },
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
      console.error('Auth error:', userError);
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has facility role and access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', userData.user.id)
      .single();

    console.log('Profile data:', profile);

    if (profileError) {
      console.error('Profile error:', profileError);
      return Response.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const facilityStaffRoles = ['facility', 'super_admin', 'admin', 'scheduler'];
    if (!facilityStaffRoles.includes(profile.role) || profile.facility_id !== facility_id) {
      console.error('Access denied:', { userRole: profile.role, userFacility: profile.facility_id, requestedFacility: facility_id });
      return Response.json(
        { error: 'Access denied to this facility' },
        { status: 403 }
      );
    }

    // Get facility information
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name, stripe_customer_id, billing_email')
      .eq('id', facility_id)
      .single();

    if (facilityError || !facility) {
      console.error('Facility error:', facilityError);
      return Response.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    let customerId = facility.stripe_customer_id;

    // Create Stripe customer if it doesn't exist
    if (!customerId) {
      console.log('Creating new Stripe customer for facility:', facility_id);
      const customer = await stripe.customers.create({
        email: facility.billing_email,
        name: facility.name,
        metadata: {
          facility_id: facility_id,
          type: 'facility'
        }
      });

      customerId = customer.id;
      console.log('Created Stripe customer:', customerId);

      // Update facility with Stripe customer ID
      await supabase
        .from('facilities')
        .update({ stripe_customer_id: customerId })
        .eq('id', facility_id);
    }

    console.log('Using Stripe customer:', customerId);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount should already be in cents
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        facility_id: facility_id,
        month: month,
        created_by: userData.user.id
      }
    });

    console.log('Payment intent created:', paymentIntent.id);

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    );

    console.log('Ephemeral key created');

    return Response.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return Response.json(
      { error: error.message || 'Failed to create payment intent' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}
