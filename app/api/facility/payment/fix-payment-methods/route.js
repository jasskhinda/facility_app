import { createRouteHandlerClient } from '@/lib/route-handler-client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { facility_id } = await request.json()

    if (!facility_id) {
      return Response.json(
        { error: 'Facility ID is required' },
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

    // Get facility information
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

    // Create customer if doesn't exist
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

      await supabase
        .from('facilities')
        .update({ stripe_customer_id: customerId })
        .eq('id', facility_id)
    }

    // Get all saved payment methods for this facility
    const { data: paymentMethods, error: pmError } = await supabase
      .from('facility_payment_methods')
      .select('id, stripe_payment_method_id')
      .eq('facility_id', facility_id)

    if (pmError) {
      return Response.json(
        { error: 'Failed to fetch payment methods' },
        { status: 500 }
      )
    }

    const fixedMethods = []
    const errorMethods = []

    // Fix each payment method
    for (const pm of paymentMethods) {
      try {
        const stripePaymentMethod = await stripe.paymentMethods.retrieve(pm.stripe_payment_method_id)
        
        if (!stripePaymentMethod.customer || stripePaymentMethod.customer !== customerId) {
          // Detach from old customer if needed
          if (stripePaymentMethod.customer) {
            try {
              await stripe.paymentMethods.detach(pm.stripe_payment_method_id)
            } catch (detachError) {
              console.error('Error detaching payment method:', detachError)
            }
          }
          
          // Attach to correct customer
          await stripe.paymentMethods.attach(pm.stripe_payment_method_id, {
            customer: customerId
          })
          
          fixedMethods.push(pm.stripe_payment_method_id)
        }
      } catch (error) {
        console.error(`Error fixing payment method ${pm.stripe_payment_method_id}:`, error)
        errorMethods.push({ id: pm.stripe_payment_method_id, error: error.message })
      }
    }

    return Response.json({
      success: true,
      customer_id: customerId,
      fixed_payment_methods: fixedMethods,
      error_payment_methods: errorMethods,
      total_processed: paymentMethods.length
    })

  } catch (error) {
    console.error('Payment method fix error:', error)
    return Response.json(
      { error: error.message || 'Failed to fix payment methods' },
      { status: 500 }
    )
  }
}