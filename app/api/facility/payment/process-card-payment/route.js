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

    // Get facility's Stripe customer ID
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('stripe_customer_id, name, billing_email')
      .eq('id', facility_id)
      .single()

    if (facilityError) {
      console.error('Facility query error:', facilityError)
      console.error('Facility ID:', facility_id)
      return Response.json(
        { error: `Facility not found: ${facilityError.message || 'Unknown error'}` },
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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: payment_method_id,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing`,
      metadata: {
        facility_id: facility_id,
        invoice_number: invoice_number,
        month: month
      }
    })

    // Record payment in database
    const { error: paymentError } = await supabase
      .from('facility_invoice_payments')
      .insert({
        facility_id: facility_id,
        amount: amount,
        payment_method: 'credit_card',
        stripe_payment_intent_id: paymentIntent.id,
        month: month,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending'
      })

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      // Continue - payment was processed by Stripe
    }

    if (paymentIntent.status === 'requires_action') {
      return Response.json({
        requires_action: true,
        payment_intent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret
        }
      })
    } else if (paymentIntent.status === 'succeeded') {
      return Response.json({
        success: true,
        payment_intent_id: paymentIntent.id
      })
    } else {
      return Response.json(
        { error: 'Payment failed' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Card payment processing error:', error)
    return Response.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    )
  }
}