import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// GET handler to retrieve facility payment methods
export async function GET(request) {
  try {
    // Check if Stripe is properly initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    
    if (!facilityId) {
      return NextResponse.json(
        { error: 'Facility ID is required' },
        { status: 400 }
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

    // Get facility's Stripe customer ID
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('stripe_customer_id')
      .eq('id', facilityId)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }
    
    // If no customer ID, return empty list
    if (!facility?.stripe_customer_id) {
      return NextResponse.json({ paymentMethods: [] });
    }
    
    // Retrieve the facility's payment methods from Stripe
    const cardMethods = await stripe.paymentMethods.list({
      customer: facility.stripe_customer_id,
      type: 'card',
    });

    const bankMethods = await stripe.paymentMethods.list({
      customer: facility.stripe_customer_id,
      type: 'us_bank_account',
    });
    
    const allMethods = [...cardMethods.data, ...bankMethods.data];
    
    return NextResponse.json({ paymentMethods: allMethods });
  } catch (error) {
    console.error('Error retrieving facility payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment methods' },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a facility payment method
export async function DELETE(request) {
  try {
    // Check if Stripe is properly initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const { paymentMethodId, facilityId } = await request.json();
    
    if (!paymentMethodId || !facilityId) {
      return NextResponse.json(
        { error: 'Payment method ID and facility ID are required' },
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

    // Get facility's Stripe customer ID to verify ownership
    const { data: facility } = await supabase
      .from('facilities')
      .select('stripe_customer_id')
      .eq('id', facilityId)
      .single();
    
    // Try to retrieve and detach the payment method from Stripe
    let stripeDetachSuccess = false;
    
    try {
      if (facility?.stripe_customer_id) {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        if (paymentMethod.customer === facility.stripe_customer_id) {
          // Detach the payment method from the customer
          await stripe.paymentMethods.detach(paymentMethodId);
          stripeDetachSuccess = true;
          console.log(`Successfully detached payment method ${paymentMethodId} from Stripe`);
        } else {
          console.log(`Payment method ${paymentMethodId} belongs to different customer, skipping Stripe detach`);
        }
      } else {
        console.log('Facility has no stripe_customer_id, skipping Stripe detach');
      }
    } catch (stripeError) {
      console.error('Stripe detach error:', stripeError);
      
      // If payment method doesn't exist in Stripe, that's actually what we want
      if (stripeError.code === 'resource_missing') {
        console.log(`Payment method ${paymentMethodId} not found in Stripe (already deleted)`);
        stripeDetachSuccess = true; // Consider this success since the goal is achieved
      } else {
        console.error('Unexpected Stripe error:', stripeError.message);
        // Continue anyway to clean up database
      }
    }
    
    // Always try to remove from database regardless of Stripe result
    const { error: dbError } = await supabase
      .from('facility_payment_methods')
      .delete()
      .eq('stripe_payment_method_id', paymentMethodId)
      .eq('facility_id', facilityId);
    
    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json(
        { error: 'Failed to remove payment method from database' },
        { status: 500 }
      );
    }
    
    console.log(`Successfully removed payment method ${paymentMethodId} from database`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting facility payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}

// PUT handler to update default payment method
export async function PUT(request) {
  try {
    const { paymentMethodId, facilityId, action } = await request.json();
    
    if (!paymentMethodId || !facilityId || action !== 'set_default') {
      return NextResponse.json(
        { error: 'Payment method ID, facility ID, and action are required' },
        { status: 400 }
      );
    }
    
    // Get the user session
    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to update a payment method' },
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

    // Use direct database updates with transaction-like approach
    console.log('🔧 Attempting to set default payment method:', {
      facilityId,
      paymentMethodId,
      userRole: profile.role
    });
    
    try {
      // First, verify the payment method exists and belongs to this facility
      const { data: paymentMethod, error: verifyError } = await supabase
        .from('facility_payment_methods')
        .select('id, nickname, payment_method_type')
        .eq('id', paymentMethodId)
        .eq('facility_id', facilityId)
        .single();

      if (verifyError || !paymentMethod) {
        console.error('❌ Payment method not found or access denied:', verifyError);
        return NextResponse.json(
          { error: 'Payment method not found or access denied' },
          { status: 404 }
        );
      }

      console.log('✅ Payment method verified:', paymentMethod);

      // Step 1: Remove default from all payment methods for this facility
      const { error: clearError } = await supabase
        .from('facility_payment_methods')
        .update({ is_default: false })
        .eq('facility_id', facilityId);

      if (clearError) {
        console.error('❌ Error clearing default payment methods:', clearError);
        return NextResponse.json(
          { error: 'Failed to clear default payment methods: ' + clearError.message },
          { status: 500 }
        );
      }

      console.log('✅ Cleared default flag from all payment methods');

      // Step 2: Set the new default payment method
      const { error: setError } = await supabase
        .from('facility_payment_methods')
        .update({ 
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentMethodId)
        .eq('facility_id', facilityId);

      if (setError) {
        console.error('❌ Error setting default payment method:', setError);
        return NextResponse.json(
          { error: 'Failed to set default payment method: ' + setError.message },
          { status: 500 }
        );
      }
      
      console.log('✅ Successfully set default payment method using direct updates');

    } catch (error) {
      console.error('❌ Transaction failed:', error);
      return NextResponse.json(
        { error: 'Failed to set default payment method: ' + error.message },
        { status: 500 }
      );
    }

    console.log(`Successfully set payment method ${paymentMethodId} as default for facility ${facilityId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating default payment method:', error);
    return NextResponse.json(
      { error: 'Failed to update default payment method' },
      { status: 500 }
    );
  }
}