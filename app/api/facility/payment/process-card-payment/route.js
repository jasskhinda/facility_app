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
          facility_id: facility_id,
          type: 'facility'
        }
      })

      customerId = customer.id

      // Update facility with Stripe customer ID
      await supabase
        .from('facilities')
        .update({ stripe_customer_id: customerId })
        .eq('id', facility_id)
      
      console.log(`Created new Stripe customer ${customerId} for facility ${facility_id}`)
    }

    // Verify the customer exists in Stripe and get the latest information
    try {
      const stripeCustomer = await stripe.customers.retrieve(customerId)
      console.log(`Using Stripe customer: ${customerId} for facility: ${facility_id}`)
    } catch (customerError) {
      console.error('Stripe customer error:', customerError)
      return Response.json(
        { error: 'Invalid customer. Please contact support.' },
        { status: 400 }
      )
    }

    // First, try to attach the payment method to the customer if it's not already attached
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id)
      
      // If the payment method isn't attached to any customer or attached to a different customer
      if (!paymentMethod.customer || paymentMethod.customer !== customerId) {
        // Detach from old customer first if needed
        if (paymentMethod.customer) {
          try {
            await stripe.paymentMethods.detach(payment_method_id)
          } catch (detachError) {
            console.error('Error detaching payment method from old customer:', detachError)
            // Continue anyway, try to attach to new customer
          }
        }
        
        // Attach the payment method to the correct customer
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: customerId
        })
        
        console.log(`Successfully attached payment method ${payment_method_id} to customer ${customerId}`)
      }
    } catch (attachError) {
      console.error('Error handling payment method attachment:', attachError)
      
      // Handle specific Stripe errors
      if (attachError.code === 'resource_missing') {
        return Response.json(
          { error: 'Payment method not found. Please use a different card or add a new one.' },
          { status: 400 }
        )
      } else if (attachError.code === 'payment_method_already_attached') {
        console.log('Payment method already attached to a customer, proceeding...')
        // This error can be ignored if payment method is already attached to correct customer
      } else {
        // For other attachment errors, return a descriptive error
        return Response.json(
          { error: `Payment method error: ${attachError.message}. Please try using a different payment method or contact support.` },
          { status: 400 }
        )
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: payment_method_id,
      confirmation_method: 'manual',
      confirm: true,
      return_url: 'https://facility.compassionatecaretransportation.com/dashboard/billing',
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

    // Update or create invoice record
    if (paymentIntent.status === 'succeeded') {
      // Check if invoice exists
      const { data: existingInvoice } = await supabase
        .from('facility_invoices')
        .select('id')
        .eq('facility_id', facility_id)
        .eq('month', month)
        .single()

      if (existingInvoice) {
        // Update existing invoice
        await supabase.rpc('update_payment_status_with_audit', {
          p_invoice_id: existingInvoice.id,
          p_new_status: 'PAID WITH CARD',
          p_user_id: userData.user.id,
          p_user_role: 'facility',
          p_notes: `Payment processed via Stripe. Payment Intent: ${paymentIntent.id}`
        })
      } else {
        // Create new invoice
        await supabase
          .from('facility_invoices')
          .insert({
            facility_id: facility_id,
            invoice_number: invoice_number,
            month: month,
            total_amount: amount,
            payment_status: 'PAID WITH CARD'
          })
      }
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