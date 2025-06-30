import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function POST(request) {
  try {
    const { facility_id, invoice_number, month, amount, check_submission_type } = await request.json()

    if (!facility_id || !invoice_number || !amount || !check_submission_type) {
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

    // Get payment settings for check details
    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('check_payable_to, check_mailing_address')
      .single()

    const checkPayableTo = paymentSettings?.check_payable_to || 'Compassionate Care Transportation'
    const checkMailingAddress = paymentSettings?.check_mailing_address || '123 Main Street, City, State 12345'

    // Determine payment method and status based on submission type
    let paymentMethod
    let paymentStatus
    let message

    if (check_submission_type === 'submit_request') {
      paymentMethod = 'check_submit'
      paymentStatus = 'pending'
      message = `Check payment request submitted. Please send check for $${amount.toFixed(2)} to: ${checkMailingAddress}. Make check payable to: ${checkPayableTo}`
    } else if (check_submission_type === 'already_sent') {
      paymentMethod = 'check_sent'
      paymentStatus = 'pending'
      message = 'Check marked as sent. Our dispatch team will verify receipt and update status accordingly.'
    } else {
      return Response.json(
        { error: 'Invalid check submission type' },
        { status: 400 }
      )
    }

    // Record payment submission in database
    const { data: paymentData, error: paymentError } = await supabase
      .from('facility_invoice_payments')
      .insert({
        facility_id: facility_id,
        amount: amount,
        payment_method: paymentMethod,
        month: month,
        status: paymentStatus,
        billing_name: profile.full_name || 'Facility Payment'
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error recording check payment:', paymentError)
      return Response.json(
        { error: 'Failed to record payment submission' },
        { status: 500 }
      )
    }

    // Update invoice status based on submission type
    let invoiceStatus
    if (check_submission_type === 'submit_request') {
      invoiceStatus = 'PROCESSING PAYMENT'
    } else {
      invoiceStatus = 'PAID WITH CHECK (BEING VERIFIED)'
    }

    // Find or create the facility invoice record
    const { data: existingInvoice, error: invoiceQueryError } = await supabase
      .from('facility_invoices')
      .select('id')
      .eq('facility_id', facility_id)
      .eq('month', month)
      .single()

    if (invoiceQueryError && invoiceQueryError.code !== 'PGRST116') {
      console.error('Error querying invoice:', invoiceQueryError)
    }

    if (existingInvoice) {
      // Update existing invoice
      const { error: updateError } = await supabase
        .from('facility_invoices')
        .update({
          payment_status: invoiceStatus,
          last_updated: new Date().toISOString()
        })
        .eq('id', existingInvoice.id)

      if (updateError) {
        console.error('Error updating invoice status:', updateError)
      }
    } else {
      // Create new invoice record
      const { error: createError } = await supabase
        .from('facility_invoices')
        .insert({
          facility_id: facility_id,
          invoice_number: invoice_number,
          month: month,
          total_amount: amount,
          payment_status: invoiceStatus,
          total_trips: 0, // This should be calculated based on actual trips
          billing_email: profile.email
        })

      if (createError) {
        console.error('Error creating invoice:', createError)
      }
    }

    // Create audit log entry
    const auditResult = await supabase.rpc('update_payment_status_with_audit', {
      p_invoice_id: existingInvoice?.id || null,
      p_new_status: invoiceStatus,
      p_user_id: userData.user.id,
      p_user_role: 'facility',
      p_notes: `Check payment ${check_submission_type === 'submit_request' ? 'request submitted' : 'marked as sent'}`,
      p_verification_notes: message
    }).catch(err => {
      console.error('Audit log error:', err)
      // Don't fail the main operation for audit log errors
    })

    return Response.json({
      success: true,
      payment_id: paymentData.id,
      message: message,
      check_details: {
        payable_to: checkPayableTo,
        mailing_address: checkMailingAddress,
        amount: amount
      },
      next_steps: check_submission_type === 'submit_request' 
        ? 'Please send your check to the provided address. Status will update once received and verified.'
        : 'Our dispatch team will verify receipt of your check and update the status accordingly.'
    })

  } catch (error) {
    console.error('Check payment processing error:', error)
    return Response.json(
      { error: error.message || 'Check payment processing failed' },
      { status: 500 }
    )
  }
}