import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { facilityId, paymentMethodType = 'card', metadata = {} } = body;

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
        { error: 'You must be logged in to create a setup intent' },
        { status: 401 }
      );
    }

    // If facilityId is provided, handle facility payment methods
    if (facilityId) {
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

      // Create setup intent for facility payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: paymentMethodType === 'card' ? ['card'] : ['us_bank_account'],
        usage: 'off_session',
        metadata: {
          facility_id: facilityId,
          payment_method_type: paymentMethodType,
          created_by: session.user.id,
          ...metadata
        }
      });

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id
      });
    }

    // Handle individual user payment methods (existing functionality)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    let customerId = profile?.stripe_customer_id;
    
    // If the customer doesn't exist in Stripe yet, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.user_metadata?.full_name || 'User',
        metadata: {
          user_id: session.user.id,
          type: 'individual'
        }
      });
      
      customerId = customer.id;
      
      // Save the customer ID to the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id);
      
      if (updateError) {
        console.error('Error updating profile with Stripe customer ID:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user profile with Stripe customer ID' },
          { status: 500 }
        );
      }
    }
    
    // Create a setup intent to securely collect payment method details
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    
    // Return the client secret to the client
    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}