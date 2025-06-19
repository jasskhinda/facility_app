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
    
    // Build query for trips with costs for facility clients
    // First get all users belonging to this facility
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('facility_id', profile.facility_id);
    
    if (facilityUsersError) {
      return NextResponse.json({ error: facilityUsersError.message }, { status: 500 });
    }
    
    const facilityUserIds = facilityUsers.map(user => user.id);
    
    // Get managed clients for this facility (if table exists)
    let facilityManagedClientIds = [];
    try {
      const { data: managedClientsForFacility, error: managedClientsError } = await supabase
        .from('managed_clients')
        .select('id')
        .eq('facility_id', profile.facility_id);
      
      if (!managedClientsError && managedClientsForFacility) {
        facilityManagedClientIds = managedClientsForFacility.map(client => client.id);
      }
    } catch (error) {
      // managed_clients table might not exist - continue without it
      console.log('managed_clients table not found, continuing without managed clients');
    }
    
    // Now query trips for these users and managed clients
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
      .not('price', 'is', null)
      .gt('price', 0)
      .order('created_at', { ascending: false });
    
    // Filter for trips by facility users OR managed clients  
    if (facilityUserIds.length > 0 && facilityManagedClientIds.length > 0) {
      query = query.or(`user_id.in.(${facilityUserIds.join(',')}),managed_client_id.in.(${facilityManagedClientIds.join(',')})`);
    } else if (facilityUserIds.length > 0) {
      query = query.in('user_id', facilityUserIds);
    } else if (facilityManagedClientIds.length > 0) {
      query = query.in('managed_client_id', facilityManagedClientIds);
    } else {
      // No users or managed clients for this facility - return empty
      return NextResponse.json({ 
        bills: [], 
        summary: { total_bills: 0, total_amount: 0, paid_amount: 0, outstanding_amount: 0, overdue_count: 0, completed_trips: 0, pending_trips: 0, cancelled_trips: 0 }
      });
    }
    
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
    
    // Fetch user profiles for the trips
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
    
    // Fetch managed clients if needed (if table exists)
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
    
    // Transform trips into bill format
    const bills = trips.map(trip => {
      const userProfile = userProfiles.find(profile => profile.id === trip.user_id);
      const managedClient = managedClients.find(mc => mc.id === trip.managed_client_id);
      const client = userProfile || managedClient;
      
      return {
        id: trip.id,
        bill_number: `TRIP-${trip.id.split('-')[0].toUpperCase()}`,
        client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown Client',
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
        profiles: client
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
