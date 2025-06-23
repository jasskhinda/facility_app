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
        managed_client_id
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
    
    // Fetch user profiles for the trips to get client names
    const userIds = [...new Set(trips.filter(trip => trip.user_id).map(trip => trip.user_id))];
    let userProfiles = [];
    
    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      if (!profileError && profileData) {
        userProfiles = profileData;
      }
    }
    
    // Fetch managed clients for the trips to get client names
    const managedClientIds = [...new Set(trips.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];
    let managedClients = [];
    
    if (managedClientIds.length > 0) {
      try {
        const { data: managedData, error: managedError } = await supabase
          .from('managed_clients')
          .select('id, first_name, last_name')
          .in('id', managedClientIds);
        
        if (!managedError && managedData) {
          managedClients = managedData;
        }
      } catch (error) {
        // managed_clients table might not exist - continue without it
        console.log('managed_clients table not found during fetch, continuing without managed clients');
      }
    }
    
    // Transform trips into bill format with enhanced client name resolution
    const bills = trips.map(trip => {
      // Smart client name detection using fetched profile data
      let clientName = 'Unknown Client';
      
      if (trip.user_id) {
        const userProfile = userProfiles.find(profile => profile.id === trip.user_id);
        if (userProfile && userProfile.first_name) {
          clientName = `${userProfile.first_name} ${userProfile.last_name || ''}`.trim();
        }
      } else if (trip.managed_client_id) {
        const managedClient = managedClients.find(client => client.id === trip.managed_client_id);
        if (managedClient && managedClient.first_name) {
          clientName = `${managedClient.first_name} ${managedClient.last_name || ''} (Managed)`.trim();
        }
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
        profiles: trip.user_id ? userProfiles.find(p => p.id === trip.user_id) : managedClients.find(c => c.id === trip.managed_client_id)
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
