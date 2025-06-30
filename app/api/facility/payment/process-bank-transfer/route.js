import { createRouteHandlerClient } from '@/lib/route-handler-client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { facility_id, invoice_number, month, amount, payment_method_id } = await request.json()

    if (!facility_id || !invoice_number || !amount || !payment_method_id) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createRouteHandlerClient()

    // Verify user authentication and role
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has facility role and access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', userData.user.id)
      .single()

    if (profileError || profile.role !== 'facility' || profile.facility_id !== facility_id) {
      return Response.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get payment method details
    const { data: paymentMethodData, error: pmError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .eq('facility_id', facility_id)
      .eq('payment_method_type', 'bank_transfer')
      .single()

    if (pmError || !paymentMethodData) {
      return Response.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Get facility's Stripe customer ID
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('stripe_customer_id, name, billing_email')
      .eq('id', facility_id)
      .single()

    if (facilityError) {
      return Response.json(
        { error: 'Facility not found' },
        { status: 404 }
      )
    }

    let customerId = facility.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: facility.billing_email,
        name: facility.name,
        metadata: {
          facility_id: facility_id
        }
      })

      customerId = customer.id

      // Update facility with Stripe customer ID
      await supabase
        .from('facilities')
        .update({ stripe_customer_id: customerId })
        .eq('id', facility_id)
    }

    // Create ACH payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodData.stripe_payment_method_id,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        facility_id: facility_id,
        invoice_number: invoice_number,
        month: month,
        payment_type: 'bank_transfer'
      }
    })

    // Record payment in database
    const { error: paymentError } = await supabase
      .from('facility_invoice_payments')
      .insert({
        facility_id: facility_id,
        amount: amount,
        payment_method: 'bank_transfer',
        payment_method_id: payment_method_id,
        stripe_payment_intent_id: paymentIntent.id,
        month: month,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
        billing_name: paymentMethodData.bank_account_holder_name
      })

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      // Continue - payment was processed by Stripe
    }

    if (paymentIntent.status === 'succeeded') {
      return Response.json({
        success: true,
        payment_intent_id: paymentIntent.id,
        message: 'Bank transfer initiated successfully'
      })
    } else if (paymentIntent.status === 'processing') {
      return Response.json({
        success: true,
        payment_intent_id: paymentIntent.id,
        message: 'Bank transfer is being processed and will complete in 1-3 business days'
      })
    } else {
      return Response.json(
        { error: 'Bank transfer failed' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Bank transfer processing error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return Response.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return Response.json(
      { error: error.message || 'Bank transfer processing failed' },
      { status: 500 }
    )
  }
}