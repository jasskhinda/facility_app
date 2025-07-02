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

    // Handle payment method customer association issues
    let finalPaymentMethodId = payment_method_id
    let shouldCreateNewPaymentMethod = false
    
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id)
      console.log(`Payment method ${payment_method_id} currently attached to customer: ${paymentMethod.customer}`)
      console.log(`Target customer: ${customerId}`)
      
      // Check if payment method is detached or unusable
      if (!paymentMethod.customer) {
        console.log('Payment method is detached, attempting to reattach...')
        try {
          await stripe.paymentMethods.attach(payment_method_id, {
            customer: customerId
          })
          console.log(`Successfully reattached payment method ${payment_method_id} to customer ${customerId}`)
        } catch (attachError) {
          console.error('Failed to reattach payment method:', attachError)
          if (attachError.code === 'payment_method_unattachable') {
            console.log('Payment method cannot be reused, will create new one')
            shouldCreateNewPaymentMethod = true
          } else {
            throw attachError
          }
        }
      } else if (paymentMethod.customer !== customerId) {
        console.log('Payment method belongs to different customer, using that customer for payment')
        customerId = paymentMethod.customer
      }
      
    } catch (pmError) {
      console.error('Error retrieving payment method:', pmError)
      
      if (pmError.code === 'resource_missing') {
        return Response.json(
          { error: 'Payment method not found. Please add a new card.' },
          { status: 400 }
        )
      }
      
      // For other errors, still try to process but log the issue
      console.error('Payment method error, proceeding anyway:', pmError.message)
    }
    
    // If we need to create a new payment method, return error asking user to add new card
    if (shouldCreateNewPaymentMethod) {
      return Response.json(
        { 
          error: 'This payment method is no longer usable. Please remove it and add a new card.',
          code: 'payment_method_unusable'
        },
        { status: 400 }
      )
    }

    // Create payment intent with the payment method's actual customer
    let paymentIntent
    
    try {
      paymentIntent = await stripe.paymentIntents.create({
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
          month: month,
          original_facility_customer: facility.stripe_customer_id
        }
      })
      
      console.log(`Payment intent created successfully: ${paymentIntent.id}`)
      
    } catch (paymentIntentError) {
      console.error('Payment intent creation failed:', paymentIntentError)
      
      // Handle different types of payment method errors
      if (paymentIntentError.message && paymentIntentError.message.includes('does not belong to the Customer')) {
        console.log('Retrying payment with payment method customer...')
        
        const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id)
        const pmCustomer = paymentMethod.customer
        
        if (pmCustomer) {
          console.log(`Retrying with payment method's customer: ${pmCustomer}`)
          
          paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'usd',
            customer: pmCustomer,
            payment_method: payment_method_id,
            confirmation_method: 'manual',
            confirm: true,
            return_url: 'https://facility.compassionatecaretransportation.com/dashboard/billing',
            metadata: {
              facility_id: facility_id,
              invoice_number: invoice_number,
              month: month,
              customer_mismatch_fix: 'true',
              intended_customer: customerId,
              actual_customer: pmCustomer
            }
          })
          
          console.log(`Payment intent created with PM customer: ${paymentIntent.id}`)
          
        } else {
          throw new Error('Payment method has no associated customer')
        }
      } else if (paymentIntentError.message && paymentIntentError.message.includes('was previously used with a PaymentIntent without Customer attachment')) {
        // Payment method is detached/unusable
        return Response.json(
          { 
            error: 'This saved payment method is no longer valid. Please remove it and add a new card to continue.',
            code: 'payment_method_detached'
          },
          { status: 400 }
        )
      } else {
        throw paymentIntentError
      }
    }

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