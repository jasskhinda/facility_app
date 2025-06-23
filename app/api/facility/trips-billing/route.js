import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// GET /api/facility/trips-billing - Get all trip costs for the facility as bills
export async function GET(request) {
  // Use service role key for full access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { searchParams } = new URL(request.url);
  
  try {
    // TEMPORARY: For testing purposes, use the known facility ID
    // TODO: Restore authentication once login is working
    const profile = {
      role: 'facility',
      facility_id: 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
    };
    
    // Get user session (commented out for testing)
    // const { data: { session } } = await supabase.auth.getSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    // Check if user is facility admin (commented out for testing)
    // const { data: profile, error: profileError } = await supabase
    //   .from('profiles')
    //   .select('role, facility_id')
    //   .eq('id', session.user.id)
    //   .single();
      
    // if (profileError) {
    //   return NextResponse.json({ error: profileError.message }, { status: 500 });
    // }
    
    // if (profile.role !== 'facility') {
    //   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    // }
    
    // if (!profile.facility_id) {
    //   return NextResponse.json({ error: 'No facility associated with this account' }, { status: 400 });
    // }
    
    // ✅ CRITICAL FIX: Query trips by facility_id to only get facility-created trips
    // This excludes individual client trips booked through other apps
    let query = supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        status,
        price,
        distance,
        wheelchair_type,
        is_round_trip,
        additional_passengers,
        created_at,
        user_id,
        managed_client_id,
        profiles:user_id(first_name, last_name),
        managed_clients:managed_client_id(first_name, last_name)
      `)
      .eq('facility_id', profile.facility_id)
      .not('price', 'is', null)
      .gt('price', 0)
      .order('created_at', { ascending: false });
    
    // Apply filters
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }
    
    const year = searchParams.get('year');
    if (year) {
      query = query
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${parseInt(year) + 1}-01-01`);
    }
    
    const month = searchParams.get('month');
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query = query
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
    }
    
    const { data: trips, error: tripsError } = await query;
    
    if (tripsError) {
      return NextResponse.json({ error: tripsError.message }, { status: 500 });
    }
    
    // Transform trips into bill format with enhanced client name resolution
    const bills = trips.map(trip => {
      // Smart client name detection - matches billing components logic
      let clientName = 'Unknown Client';
      if (trip.profiles && trip.profiles.first_name) {
        clientName = `${trip.profiles.first_name} ${trip.profiles.last_name || ''}`.trim();
      } else if (trip.managed_clients && trip.managed_clients.first_name) {
        clientName = `${trip.managed_clients.first_name} ${trip.managed_clients.last_name || ''} (Managed)`.trim();
      }
      
      return {
        id: trip.id,
        bill_number: `TRIP-${trip.id.split('-')[0].toUpperCase()}`,
        client_name: clientName,
        client_id: trip.user_id || trip.managed_client_id,
        trip_id: trip.id,
        pickup_address: trip.pickup_address,
        destination_address: trip.destination_address,
        pickup_time: trip.pickup_time,
        trip_date: trip.pickup_time,
        distance: trip.distance,
        wheelchair_accessible: trip.wheelchair_type === 'wheelchair',
        is_round_trip: trip.is_round_trip,
        additional_passengers: trip.additional_passengers || 0,
        amount: parseFloat(trip.price || 0),
        total: parseFloat(trip.price || 0),
        status: trip.status === 'completed' ? 'paid' : trip.status === 'cancelled' ? 'cancelled' : 'pending',
        payment_status: trip.status === 'completed' ? 'paid' : 'pending',
        created_at: trip.created_at,
        due_date: trip.status === 'completed' ? trip.pickup_time : null,
        profiles: trip.profiles || trip.managed_clients
      };
    });
    
    // Calculate summary statistics
    const summary = {
      total_bills: bills.length,
      total_amount: bills.reduce((sum, bill) => sum + bill.amount, 0),
      paid_amount: bills
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + bill.amount, 0),
      outstanding_amount: bills
        .filter(bill => ['pending', 'overdue'].includes(bill.status))
        .reduce((sum, bill) => sum + bill.amount, 0),
      overdue_count: bills.filter(bill => bill.status === 'overdue').length,
      completed_trips: bills.filter(bill => bill.status === 'paid').length,
      pending_trips: bills.filter(bill => bill.status === 'pending').length,
      cancelled_trips: bills.filter(bill => bill.status === 'cancelled').length
    };
    
    return NextResponse.json({ bills, summary });
  } catch (error) {
    console.error('Error getting trips billing data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
