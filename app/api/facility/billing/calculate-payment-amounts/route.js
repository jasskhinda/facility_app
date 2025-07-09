import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function POST(request) {
  try {
    const { facility_id, month } = await request.json()

    if (!facility_id || !month) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createRouteHandlerClient()

    // Verify user authentication and role
    console.log('Payment amounts API: Checking authentication...')
    
    // Try both session and getUser methods for debugging
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Payment amounts API: Session check result:', { hasSession: !!session, sessionError, userEmail: session?.user?.email })
    
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('Payment amounts API: GetUser check result:', { userData: userData?.user?.email, userError })
    
    // Use session if available, otherwise fall back to userData
    const user = session?.user || userData?.user
    
    if (!user) {
      console.log('Payment amounts API: Authentication failed - no user found in session or getUser')
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has facility role and access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.role !== 'facility' || profile.facility_id !== facility_id) {
      console.log('Payment amounts API: Profile check failed:', { profileError, role: profile?.role, facility_id: profile?.facility_id, requested_facility: facility_id })
      return Response.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get the most recent verified payment for this facility in this month
    const { data: lastVerifiedPayment, error: paymentError } = await supabase
      .from('facility_invoice_payments')
      .select('*')
      .eq('facility_id', facility_id)
      .eq('month', month)
      .eq('status', 'completed')
      .order('verification_date', { ascending: false })
      .limit(1)
      .single()

    let paidAmount = 0
    let paymentVerificationDate = null
    
    if (!paymentError && lastVerifiedPayment) {
      paidAmount = lastVerifiedPayment.amount
      paymentVerificationDate = lastVerifiedPayment.verification_date
    }

    // Get all billable trips for this month
    const { data: allTrips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('facility_id', facility_id)
      .eq('billable', true)
      .gte('pickup_date', `${month}-01`)
      .lt('pickup_date', `${getNextMonth(month)}-01`)
      .order('pickup_date', { ascending: true })

    if (tripsError) {
      return Response.json(
        { error: 'Failed to fetch trips' },
        { status: 500 }
      )
    }

    // Separate trips into paid and new billable
    let paidTrips = []
    let newBillableTrips = []
    let totalPaidAmount = 0
    let totalNewBillableAmount = 0

    if (paymentVerificationDate) {
      // Split trips based on verification date
      const verificationCutoff = new Date(paymentVerificationDate)
      
      for (const trip of allTrips) {
        const tripDate = new Date(trip.pickup_date)
        
        if (tripDate <= verificationCutoff) {
          paidTrips.push(trip)
          totalPaidAmount += parseFloat(trip.total_fare || 0)
        } else {
          newBillableTrips.push(trip)
          totalNewBillableAmount += parseFloat(trip.total_fare || 0)
        }
      }
    } else {
      // No verified payment yet, all trips are new billable
      newBillableTrips = allTrips
      totalNewBillableAmount = allTrips.reduce((sum, trip) => sum + parseFloat(trip.total_fare || 0), 0)
    }

    // Get current invoice status
    const { data: currentInvoice, error: invoiceError } = await supabase
      .from('facility_invoices')
      .select('*')
      .eq('facility_id', facility_id)
      .eq('month', month)
      .single()

    let invoiceStatus = 'UNPAID'
    let paymentNotes = ''
    let paymentHistory = []
    
    if (!invoiceError && currentInvoice) {
      invoiceStatus = currentInvoice.payment_status
      paymentNotes = currentInvoice.payment_notes || ''
      
      // Get payment history
      const { data: history, error: historyError } = await supabase
        .from('facility_invoice_payments')
        .select('*')
        .eq('facility_id', facility_id)
        .eq('month', month)
        .order('payment_date', { ascending: true })

      if (!historyError && history) {
        paymentHistory = history
      }
    }

    // Determine payment status and amounts
    let displayStatus = 'UNPAID'
    let showPaidAmount = false
    let showNewBillableAmount = false
    
    if (invoiceStatus === 'PAID WITH CHECK - VERIFIED') {
      displayStatus = 'PAID WITH CHECK - VERIFIED'
      showPaidAmount = true
      showNewBillableAmount = totalNewBillableAmount > 0
    } else if (invoiceStatus.includes('CHECK PAYMENT')) {
      displayStatus = invoiceStatus
      showPaidAmount = false
      showNewBillableAmount = false // Don't show new billable during check processing
    } else if (totalNewBillableAmount > 0) {
      displayStatus = 'UNPAID'
      // Only show paid amount if there's actually a verified payment
      showPaidAmount = paidAmount > 0 && lastVerifiedPayment
      showNewBillableAmount = true
    }

    return Response.json({
      success: true,
      payment_breakdown: {
        paid_amount: totalPaidAmount,
        new_billable_amount: totalNewBillableAmount,
        total_amount: totalPaidAmount + totalNewBillableAmount,
        show_paid_amount: showPaidAmount,
        show_new_billable_amount: showNewBillableAmount
      },
      trip_breakdown: {
        paid_trips: paidTrips.length,
        new_billable_trips: newBillableTrips.length,
        total_trips: allTrips.length
      },
      payment_status: {
        current_status: displayStatus,
        can_make_payment: showNewBillableAmount && !invoiceStatus.includes('CHECK PAYMENT'),
        payment_in_progress: invoiceStatus.includes('CHECK PAYMENT')
      },
      payment_dates: {
        last_payment_date: paymentVerificationDate,
        last_payment_amount: paidAmount,
        verification_cutoff: paymentVerificationDate
      },
      payment_history: paymentHistory,
      invoice_details: currentInvoice,
      debug: {
        month,
        facility_id,
        invoice_status: invoiceStatus,
        last_verified_payment: lastVerifiedPayment,
        trips_count: allTrips.length,
        payment_verification_date: paymentVerificationDate
      }
    })

  } catch (error) {
    console.error('Payment calculation error:', error)
    return Response.json(
      { error: error.message || 'Payment calculation failed' },
      { status: 500 }
    )
  }
}

function getNextMonth(month) {
  const [year, monthNum] = month.split('-').map(Number)
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1
  const nextYear = monthNum === 12 ? year + 1 : year
  return `${nextYear}-${nextMonth.toString().padStart(2, '0')}`
}