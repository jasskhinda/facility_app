import { createRouteHandlerClient } from '@/lib/route-handler-client'
import { NextResponse } from 'next/server'

// Endpoint to mark all test bank accounts as verified
// This is only for development/testing with Stripe test mode
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

    // Update all bank accounts for this facility to verified status
    const { data: updated, error: updateError } = await supabase
      .from('facility_payment_methods')
      .update({ verification_status: 'verified' })
      .eq('facility_id', profile.facility_id)
      .eq('payment_method_type', 'bank_transfer')
      .eq('verification_status', 'pending')
      .select()

    if (updateError) {
      console.error('Error updating bank accounts:', updateError)
      return NextResponse.json(
        { error: 'Failed to update bank accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updated_count: updated?.length || 0,
      message: `Successfully verified ${updated?.length || 0} test bank account(s)`
    })

  } catch (error) {
    console.error('Error verifying test bank accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify test bank accounts' },
      { status: 500 }
    )
  }
}
