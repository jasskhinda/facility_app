import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function POST(request) {
  try {
    const { facility_id, month } = await request.json()

    if (!facility_id || !month) {
      return Response.json(
        { error: 'Facility ID and month are required' },
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

    // Get the latest payment for this facility and month
    const { data: latestPayment, error: paymentError } = await supabase
      .from('facility_invoice_payments')
      .select('*')
      .eq('facility_id', facility_id)
      .eq('month', month)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false })
      .limit(1)
      .single()

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('Error fetching latest payment:', paymentError)
      return Response.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      )
    }

    // If no payment exists, return all completed trips for the month
    if (!latestPayment) {
      return await getAllCompletedTripsForMonth(supabase, facility_id, month)
    }

    // Get trips completed after the last payment
    const paymentDate = new Date(latestPayment.payment_date)
    
    // Calculate date range for the month
    const [year, monthNum] = month.split('-')
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999)
    
    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    // Get completed trips after the last payment date
    const { data: newTrips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        price,
        status,
        wheelchair_type,
        is_round_trip,
        additional_passengers,
        managed_client_id,
        user_id,
        completed_at
      `)
      .eq('facility_id', facility_id)
      .eq('status', 'completed')
      .gte('pickup_time', startISO)
      .lte('pickup_time', endISO)
      .gt('completed_at', paymentDate.toISOString()) // Trips completed after last payment
      .order('completed_at', { ascending: false })

    if (tripsError) {
      console.error('Error fetching new trips:', tripsError)
      return Response.json(
        { error: 'Failed to fetch new trips' },
        { status: 500 }
      )
    }

    // Calculate new billable amount
    const newAmount = (newTrips || []).reduce((sum, trip) => {
      return sum + parseFloat(trip.price || 0)
    }, 0)

    return Response.json({
      success: true,
      new_trips: newTrips || [],
      new_trips_count: (newTrips || []).length,
      new_amount: newAmount,
      last_payment_date: latestPayment.payment_date,
      last_payment_amount: latestPayment.amount,
      message: newTrips && newTrips.length > 0 
        ? `${newTrips.length} new completed trips since last payment`
        : 'No new completed trips since last payment'
    })

  } catch (error) {
    console.error('Calculate new trips error:', error)
    return Response.json(
      { error: error.message || 'Failed to calculate new trips' },
      { status: 500 }
    )
  }
}

// Helper function to get all completed trips for a month (when no payment exists)
async function getAllCompletedTripsForMonth(supabase, facility_id, month) {
  const [year, monthNum] = month.split('-')
  const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
  const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999)
  
  const startISO = startDate.toISOString()
  const endISO = endDate.toISOString()

  const { data: allTrips, error: tripsError } = await supabase
    .from('trips')
    .select(`
      id,
      pickup_address,
      destination_address,
      pickup_time,
      price,
      status,
      wheelchair_type,
      is_round_trip,
      additional_passengers,
      managed_client_id,
      user_id,
      completed_at
    `)
    .eq('facility_id', facility_id)
    .eq('status', 'completed')
    .gte('pickup_time', startISO)
    .lte('pickup_time', endISO)
    .order('completed_at', { ascending: false })

  if (tripsError) {
    throw new Error(`Failed to fetch trips: ${tripsError.message}`)
  }

  const totalAmount = (allTrips || []).reduce((sum, trip) => {
    return sum + parseFloat(trip.price || 0)
  }, 0)

  return Response.json({
    success: true,
    new_trips: allTrips || [],
    new_trips_count: (allTrips || []).length,
    new_amount: totalAmount,
    last_payment_date: null,
    last_payment_amount: 0,
    message: `All ${(allTrips || []).length} completed trips for the month (no previous payments)`
  })
}