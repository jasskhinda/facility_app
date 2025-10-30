import { createRouteHandlerClient } from '@/lib/route-handler-client'
import { NextResponse } from 'next/server'

// Endpoint to reset invoice payment status (for testing/admin purposes)
export async function POST(request) {
  try {
    const { invoice_number, new_status } = await request.json()

    if (!invoice_number) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      )
    }

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

    // Get the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('facility_invoices')
      .select('*')
      .eq('invoice_number', invoice_number)
      .eq('facility_id', profile.facility_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Determine new status
    const statusToSet = new_status || 'UPCOMING INVOICE'

    // Update invoice status
    const { data: updated, error: updateError } = await supabase
      .from('facility_invoices')
      .update({
        payment_status: statusToSet,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    // Also delete any payment records associated with this invoice (optional, for clean reset)
    const { error: paymentsDeleteError } = await supabase
      .from('facility_invoice_payments')
      .delete()
      .eq('facility_id', profile.facility_id)
      .eq('month', invoice.month)

    if (paymentsDeleteError) {
      console.warn('Could not delete payment records:', paymentsDeleteError)
      // Don't fail the request, just log it
    }

    return NextResponse.json({
      success: true,
      invoice: updated,
      message: `Invoice ${invoice_number} status reset to "${statusToSet}"`
    })

  } catch (error) {
    console.error('Error resetting invoice status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset invoice status' },
      { status: 500 }
    )
  }
}
