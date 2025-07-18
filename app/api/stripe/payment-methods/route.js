import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// GET handler to retrieve payment methods
export async function GET(request) {
  try {
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
        { error: 'You must be logged in to view payment methods' },
        { status: 401 }
      );
    }
    
    // Check if we're getting a specific payment method
    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('paymentMethodId');
    
    if (paymentMethodId) {
      // Retrieve a single payment method
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        return NextResponse.json({ paymentMethod });
      } catch (err) {
        console.error('Error retrieving payment method:', err);
        return NextResponse.json(
          { error: 'Failed to retrieve payment method' },
          { status: 404 }
        );
      }
    }
    
    // Get the Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    // If no customer ID, return empty list
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ paymentMethods: [] });
    }
    
    // Retrieve the customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    });
    
    return NextResponse.json({ paymentMethods: paymentMethods.data });
  } catch (error) {
    console.error('Error retrieving payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment methods' },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a payment method
export async function DELETE(request) {
  try {
    // Check if Stripe is properly initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const { paymentMethodId } = await request.json();
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }
    
    // Get the user session
    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to delete a payment method' },
        { status: 401 }
      );
    }
    
    // Verify the payment method belongs to this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single();
    
    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no associated payment methods' },
        { status: 400 }
      );
    }
    
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    if (paymentMethod.customer !== profile.stripe_customer_id) {
      return NextResponse.json(
        { error: 'This payment method does not belong to the current user' },
        { status: 403 }
      );
    }
    
    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}