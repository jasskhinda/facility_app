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

    // Get all payment methods in the database for this facility
    const { data: dbPaymentMethods, error: dbError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', facility_id)

    if (dbError) {
      return Response.json(
        { error: 'Failed to fetch payment methods from database' },
        { status: 500 }
      )
    }

    const cleanupResults = {
      total_db_methods: dbPaymentMethods.length,
      removed_from_db: [],
      stripe_errors: [],
      kept_methods: []
    }

    // Check each payment method in the database
    for (const dbMethod of dbPaymentMethods) {
      try {
        // Try to retrieve the payment method from Stripe
        const stripePaymentMethod = await stripe.paymentMethods.retrieve(dbMethod.stripe_payment_method_id)
        
        // If we can retrieve it, keep it
        cleanupResults.kept_methods.push({
          id: dbMethod.id,
          stripe_id: dbMethod.stripe_payment_method_id,
          customer: stripePaymentMethod.customer
        })
        
      } catch (stripeError) {
        console.log(`Payment method ${dbMethod.stripe_payment_method_id} not found in Stripe:`, stripeError.message)
        
        // If payment method doesn't exist in Stripe, remove it from database
        const { error: deleteError } = await supabase
          .from('facility_payment_methods')
          .delete()
          .eq('id', dbMethod.id)

        if (deleteError) {
          console.error('Error deleting payment method from database:', deleteError)
          cleanupResults.stripe_errors.push({
            id: dbMethod.id,
            stripe_id: dbMethod.stripe_payment_method_id,
            error: `Failed to delete from database: ${deleteError.message}`
          })
        } else {
          cleanupResults.removed_from_db.push({
            id: dbMethod.id,
            stripe_id: dbMethod.stripe_payment_method_id,
            reason: 'Not found in Stripe'
          })
        }
      }
    }

    return Response.json({
      success: true,
      cleanup_results: cleanupResults,
      message: `Cleanup complete. Removed ${cleanupResults.removed_from_db.length} orphaned payment methods.`
    })

  } catch (error) {
    console.error('Payment method cleanup error:', error)
    return Response.json(
      { error: error.message || 'Failed to cleanup payment methods' },
      { status: 500 }
    )
  }
}