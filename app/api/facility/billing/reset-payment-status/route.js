import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function POST(request) {
  try {
    const { facility_id, month } = await request.json()

    if (!facility_id || !month) {
      return Response.json(
        { error: 'Missing required fields: facility_id and month' },
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
        { error: 'Access denied - facility role required' },
        { status: 403 }
      )
    }

    console.log(`🔄 TESTING: Resetting payment status for facility ${facility_id}, month ${month}`)

    // Reset facility_invoices table
    const { error: invoiceError } = await supabase
      .from('facility_invoices')
      .delete()
      .eq('facility_id', facility_id)
      .eq('month', month)

    if (invoiceError) {
      console.error('Error deleting facility_invoices:', invoiceError)
    } else {
      console.log('✅ Deleted facility_invoices records')
    }

    // Reset facility_payment_status table
    const [year, monthStr] = month.split('-')
    const monthNumber = parseInt(monthStr)
    const yearNumber = parseInt(year)

    const { error: paymentStatusError } = await supabase
      .from('facility_payment_status')
      .delete()
      .eq('facility_id', facility_id)
      .eq('invoice_month', monthNumber)
      .eq('invoice_year', yearNumber)

    if (paymentStatusError) {
      console.error('Error deleting facility_payment_status:', paymentStatusError)
    } else {
      console.log('✅ Deleted facility_payment_status records')
    }

    // Reset facility_invoice_payments table
    const { error: paymentsError } = await supabase
      .from('facility_invoice_payments')
      .delete()
      .eq('facility_id', facility_id)
      .eq('month', month)

    if (paymentsError) {
      console.error('Error deleting facility_invoice_payments:', paymentsError)
    } else {
      console.log('✅ Deleted facility_invoice_payments records')
    }

    // Reset any Stripe payment intents (mark as canceled in metadata)
    // Note: We don't actually cancel real Stripe charges for safety
    console.log('💳 Stripe payments left intact for safety (testing reset only affects local database)')

    return Response.json({
      success: true,
      message: 'Payment status reset successfully',
      details: {
        facility_id,
        month,
        reset_tables: ['facility_invoices', 'facility_payment_status', 'facility_invoice_payments'],
        note: 'Stripe payments left intact for safety'
      }
    })

  } catch (error) {
    console.error('Reset payment status error:', error)
    return Response.json(
      { error: error.message || 'Reset payment status failed' },
      { status: 500 }
    )
  }
}