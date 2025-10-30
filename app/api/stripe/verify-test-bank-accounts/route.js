import { createRouteHandlerClient } from '@/lib/route-handler-client'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Endpoint to verify test bank accounts with Stripe
// This is only for development/testing with Stripe test mode
// In test mode, we can verify bank accounts using test micro-deposit amounts
export async function POST(request) {
  try {
    const supabase = await createRouteHandlerClient()

    // Get the user session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user is facility staff
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile.facility_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const facilityStaffRoles = ['facility', 'super_admin', 'admin', 'scheduler']
    if (!facilityStaffRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get all unverified bank accounts for this facility
    const { data: bankAccounts, error: fetchError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .eq('payment_method_type', 'bank_transfer')
      .select()

    if (fetchError) {
      console.error('Error fetching bank accounts:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch bank accounts' },
        { status: 500 }
      )
    }

    if (!bankAccounts || bankAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        verified_count: 0,
        message: 'No bank accounts found to verify'
      })
    }

    // Verify each bank account with Stripe using test micro-deposit amounts
    const verifiedAccounts = []
    const errors = []

    for (const account of bankAccounts) {
      try {
        console.log(`Attempting to verify bank account ${account.id} with Stripe payment method ${account.stripe_payment_method_id}`)

        // Retrieve the payment method from Stripe
        const paymentMethod = await stripe.paymentMethods.retrieve(account.stripe_payment_method_id)

        console.log('Payment method status:', {
          id: paymentMethod.id,
          type: paymentMethod.type,
          last4: paymentMethod.us_bank_account?.last4,
          status: paymentMethod.us_bank_account?.status_details
        })

        // For test mode, use test micro-deposit amounts: 32 and 45
        // This is documented in Stripe's test mode documentation
        if (paymentMethod.us_bank_account) {
          try {
            await stripe.paymentMethods.verifyMicrodeposits(
              account.stripe_payment_method_id,
              {
                amounts: [32, 45], // Test mode micro-deposit amounts
              }
            )

            console.log(`Successfully verified payment method ${account.stripe_payment_method_id}`)

            // Update database
            await supabase
              .from('facility_payment_methods')
              .update({ verification_status: 'verified' })
              .eq('id', account.id)

            verifiedAccounts.push(account.id)
          } catch (verifyError) {
            console.error(`Verification error for ${account.stripe_payment_method_id}:`, verifyError.message)
            errors.push(`Account ${account.bank_account_last_four}: ${verifyError.message}`)
          }
        }
      } catch (error) {
        console.error(`Error processing account ${account.id}:`, error.message)
        errors.push(`Account ${account.bank_account_last_four}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      verified_count: verifiedAccounts.length,
      total_count: bankAccounts.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully verified ${verifiedAccounts.length} out of ${bankAccounts.length} bank account(s)`
    })

  } catch (error) {
    console.error('Error verifying test bank accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify test bank accounts' },
      { status: 500 }
    )
  }
}
