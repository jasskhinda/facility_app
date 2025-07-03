import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function POST(request) {
  try {
    const { facility_id, invoice_number, month, amount, check_submission_type, check_details } = await request.json()

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

    // Get facility information
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('name, billing_email')
      .eq('id', facility_id)
      .single()

    if (facilityError) {
      return Response.json(
        { error: 'Facility not found' },
        { status: 404 }
      )
    }

    // Enhanced payment tracking with check details
    const now = new Date()
    const isCurrentMonth = month === now.toISOString().slice(0, 7)
    const currentDate = now.getDate()
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const isPartialMonthPayment = isCurrentMonth && currentDate < lastDayOfMonth - 2

    // Professional check payment workflow
    let paymentStatus, paymentNote, nextSteps, facilityMessage

    switch (check_submission_type) {
      case 'will_mail':
        paymentStatus = 'CHECK PAYMENT - WILL MAIL'
        paymentNote = `Check payment initiated on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Facility indicated they will mail check for $${amount}. Awaiting check delivery to our office.`
        nextSteps = 'Please mail your check to our office address below. Your payment status will be updated when we receive and verify the check.'
        facilityMessage = 'Your payment is being processed. Please mail your check within 5 business days to complete the payment process.'
        break
        
      case 'already_mailed':
        paymentStatus = 'CHECK PAYMENT - IN TRANSIT'
        paymentNote = `Check payment marked as already mailed on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Check for $${amount} is in transit to our office.`
        
        if (check_details?.date_mailed) {
          paymentNote += ` Mailed on: ${check_details.date_mailed}.`
        }
        if (check_details?.tracking_number) {
          paymentNote += ` Tracking: ${check_details.tracking_number}.`
        }
        
        nextSteps = 'Your check is in transit. We will update the payment status once received and verified by our dispatch team.'
        facilityMessage = 'Your check is in transit to our office. It may take 3-7 business days for us to receive and verify your payment.'
        break
        
      case 'hand_delivered':
        paymentStatus = 'CHECK PAYMENT - BEING VERIFIED'
        paymentNote = `Check payment marked as hand-delivered on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Check for $${amount} was delivered directly to our office. Awaiting dispatcher verification and deposit.`
        nextSteps = 'Your check has been delivered to our office. Our dispatch team will verify and deposit it within 1-2 business days.'
        facilityMessage = 'Your check has been received at our office and is being processed by our dispatch team.'
        break
        
      default:
        return Response.json(
          { error: 'Invalid check submission type' },
          { status: 400 }
        )
    }

    // Add partial month context to notes if applicable
    if (isPartialMonthPayment) {
      paymentNote += ` This is a mid-month payment - additional trips completed after this payment will be billed separately.`
    }

    // Record professional check payment in database
    try {
      const { error: paymentError } = await supabase
        .from('facility_invoice_payments')
        .insert({
          facility_id: facility_id,
          amount: amount,
          payment_method: 'check',
          month: month,
          status: 'pending_verification',
          payment_note: paymentNote,
          partial_month_payment: isPartialMonthPayment,
          payment_date: new Date().toISOString(),
          check_submission_type: check_submission_type,
          check_details: check_details || null
        })

      if (paymentError) {
        console.error('Error recording check payment:', paymentError)
        console.error('Payment data that failed:', {
          facility_id,
          amount,
          payment_method: 'check',
          month,
          status: 'pending_verification',
          payment_note: paymentNote,
          partial_month_payment: isPartialMonthPayment,
          check_submission_type,
          check_details
        })
        return Response.json(
          { error: `Failed to record payment details: ${paymentError.message}` },
          { status: 500 }
        )
      }
    } catch (paymentInsertError) {
      console.error('Error inserting payment record:', paymentInsertError)
      return Response.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      )
    }

    // Update or create invoice record
    const { data: existingInvoice, error: fetchError } = await supabase
      .from('facility_invoices')
      .select('id')
      .eq('facility_id', facility_id)
      .eq('month', month)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing invoice:', fetchError)
      return Response.json(
        { error: 'Failed to check existing invoice' },
        { status: 500 }
      )
    }

    if (existingInvoice) {
      // Update existing invoice using professional audit function
      const { error: updateError } = await supabase.rpc('update_payment_status_with_audit', {
        p_invoice_id: existingInvoice.id,
        p_new_status: paymentStatus,
        p_user_id: userData.user.id,
        p_user_role: 'facility',
        p_notes: paymentNote
      })

      if (updateError) {
        console.error('Error updating existing invoice:', updateError)
        console.error('Update parameters:', {
          p_invoice_id: existingInvoice.id,
          p_new_status: paymentStatus,
          p_user_id: userData.user.id,
          p_user_role: 'facility',
          p_notes: paymentNote
        })
        return Response.json(
          { error: `Failed to update invoice status: ${updateError.message}` },
          { status: 500 }
        )
      }

      // Also update the additional fields directly
      await supabase
        .from('facility_invoices')
        .update({ 
          partial_month_payment: isPartialMonthPayment,
          check_submission_type: check_submission_type,
          check_details: check_details || null
        })
        .eq('id', existingInvoice.id)
    } else {
      // Create new invoice with professional tracking
      const { error: createError } = await supabase
        .from('facility_invoices')
        .insert({
          facility_id: facility_id,
          invoice_number: invoice_number,
          month: month,
          total_amount: amount,
          payment_status: paymentStatus,
          payment_notes: paymentNote,
          partial_month_payment: isPartialMonthPayment,
          check_submission_type: check_submission_type,
          check_details: check_details || null
        })

      if (createError) {
        console.error('Error creating new invoice:', createError)
        return Response.json(
          { error: 'Failed to create invoice record' },
          { status: 500 }
        )
      }
    }

    return Response.json({
      success: true,
      payment_status: paymentStatus,
      message: facilityMessage,
      next_steps: nextSteps,
      office_address: {
        name: 'Compassionate Care Transportation',
        address_line_1: '5050 Blazer Pkwy Suite 100-B',
        city: 'Dublin',
        state: 'OH',
        zip: '43017',
        attention: 'Billing Department',
        phone: '614-967-9887',
        formatted: 'Compassionate Care Transportation\nAttn: Billing Department\n5050 Blazer Pkwy Suite 100-B\nDublin, OH 43017\n\nPhone: 614-967-9887'
      },
      check_instructions: {
        payable_to: 'Compassionate Care Transportation',
        amount: `$${amount.toFixed(2)}`,
        memo: `Invoice ${invoice_number} - ${month}`,
        mail_within_days: check_submission_type === 'will_mail' ? 5 : null
      },
      payment_details: {
        amount: amount,
        invoice_number: invoice_number,
        facility_name: facility.name,
        month: month,
        submission_type: check_submission_type
      }
    })

  } catch (error) {
    console.error('Check payment processing error:', error)
    return Response.json(
      { error: error.message || 'Check payment processing failed' },
      { status: 500 }
    )
  }
}