// COMPREHENSIVE BILLING FIX - Replace the entire fetchMonthlyTrips function
// This addresses all the issues: date filtering, status filtering, and month display

const fetchMonthlyTrips = async () => {
  if (!selectedMonth || !facilityId) {
    setLoading(false);
    return;
  }

  setLoading(true);
  setError('');
  
  try {
    console.log('🔍 fetchMonthlyTrips called with:', { selectedMonth, facilityId });
    
    // Safely parse the selected month
    const startDate = new Date(selectedMonth + '-01');
    
    // Validate the date
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid date selected');
    }
    
    // Set end date to the end of the last day of the month (23:59:59.999)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    console.log('📅 Date range:', { 
      selectedMonth,
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString(),
      startDateLocal: startDate.toString(),
      endDateLocal: endDate.toString()
    });

    // First get all users belonging to this facility
    const { data: facilityUsers, error: facilityUsersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('facility_id', facilityId);
    
    console.log('👥 Facility users query result:', { facilityUsers, facilityUsersError });
    
    if (facilityUsersError) {
      console.error('Facility users fetch error:', facilityUsersError);
      setError('Failed to load facility users');
      setMonthlyTrips([]);
      setTotalAmount(0);
      return;
    }

    const facilityUserIds = facilityUsers?.map(user => user.id) || [];
    console.log('🆔 Facility user IDs:', facilityUserIds);
    
    // Get managed clients for this facility (if table exists)
    let facilityManagedClientIds = [];
    try {
      const { data: managedClientsForFacility, error: managedClientsError } = await supabase
        .from('managed_clients')
        .select('id')
        .eq('facility_id', facilityId);
      
      if (!managedClientsError && managedClientsForFacility) {
        facilityManagedClientIds = managedClientsForFacility.map(client => client.id);
      }
    } catch (error) {
      // managed_clients table might not exist - continue without it
      console.log('managed_clients table not found, continuing without managed clients');
    }

    // If no users or managed clients, return empty
    if (facilityUserIds.length === 0 && facilityManagedClientIds.length === 0) {
      console.log('❌ No users or managed clients found for facility');
      setMonthlyTrips([]);
      setTotalAmount(0);
      setError('No users or clients found for this facility');
      return;
    }

    console.log('🔍 About to query trips with filters:', {
      facilityUserIds: facilityUserIds.length,
      facilityManagedClientIds: facilityManagedClientIds.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // STRATEGY 1: Try multiple query approaches in sequence
    let trips = null;
    let error = null;
    
    // Approach 1: Standard datetime filtering with expanded status list
    console.log('🔄 Attempt 1: Standard datetime filtering...');
    let query1 = supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        destination_address,
        pickup_time,
        price,
        wheelchair_type,
        is_round_trip,
        additional_passengers,
        status,
        user_id,
        managed_client_id
      `)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false });

    // Add user filtering
    if (facilityUserIds.length > 0 && facilityManagedClientIds.length > 0) {
      query1 = query1.or(`user_id.in.(${facilityUserIds.join(',')}),managed_client_id.in.(${facilityManagedClientIds.join(',')})`);
    } else if (facilityUserIds.length > 0) {
      query1 = query1.in('user_id', facilityUserIds);
    } else if (facilityManagedClientIds.length > 0) {
      query1 = query1.in('managed_client_id', facilityManagedClientIds);
    }

    const { data: trips1, error: error1 } = await query1;
    console.log('🚗 Attempt 1 result (no status filter):', { trips: trips1?.length || 0, error: error1?.message || 'none' });
    
    if (!error1 && trips1 && trips1.length > 0) {
      // Filter by status in JavaScript to be more flexible
      const validTrips = trips1.filter(trip => {
        const validStatuses = ['completed', 'pending', 'upcoming', 'confirmed', 'in_progress', 'finished', 'active', 'booked'];
        return validStatuses.includes(trip.status?.toLowerCase());
      });
      console.log(`📊 Valid status trips: ${validTrips.length}/${trips1.length}`);
      
      if (validTrips.length > 0) {
        trips = validTrips;
        console.log('✅ Found trips with Approach 1!');
      }
    }
    
    // Approach 2: Date-only filtering if Approach 1 failed
    if (!trips || trips.length === 0) {
      console.log('🔄 Attempt 2: Date-only filtering...');
      
      const dateOnlyStart = selectedMonth + '-01';
      const nextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
      const dateOnlyEnd = nextMonth.toISOString().split('T')[0];
      
      let query2 = supabase
        .from('trips')
        .select(`
          id,
          pickup_address,
          destination_address,
          pickup_time,
          price,
          wheelchair_type,
          is_round_trip,
          additional_passengers,
          status,
          user_id,
          managed_client_id
        `)
        .gte('pickup_time', dateOnlyStart)
        .lt('pickup_time', dateOnlyEnd)
        .not('price', 'is', null)
        .gt('price', 0)
        .order('pickup_time', { ascending: false });

      // Add user filtering
      if (facilityUserIds.length > 0 && facilityManagedClientIds.length > 0) {
        query2 = query2.or(`user_id.in.(${facilityUserIds.join(',')}),managed_client_id.in.(${facilityManagedClientIds.join(',')})`);
      } else if (facilityUserIds.length > 0) {
        query2 = query2.in('user_id', facilityUserIds);
      } else if (facilityManagedClientIds.length > 0) {
        query2 = query2.in('managed_client_id', facilityManagedClientIds);
      }
      
      const { data: trips2, error: error2 } = await query2;
      console.log('🚗 Attempt 2 result:', { trips: trips2?.length || 0, error: error2?.message || 'none' });
      
      if (!error2 && trips2 && trips2.length > 0) {
        // Filter by status in JavaScript
        const validTrips = trips2.filter(trip => {
          const validStatuses = ['completed', 'pending', 'upcoming', 'confirmed', 'in_progress', 'finished', 'active', 'booked'];
          return validStatuses.includes(trip.status?.toLowerCase());
        });
        console.log(`📊 Valid status trips (Approach 2): ${validTrips.length}/${trips2.length}`);
        
        if (validTrips.length > 0) {
          trips = validTrips;
          console.log('✅ Found trips with Approach 2!');
        }
      }
    }
    
    // Approach 3: Remove status filtering entirely if still no trips
    if (!trips || trips.length === 0) {
      console.log('🔄 Attempt 3: No status filtering...');
      
      let query3 = supabase
        .from('trips')
        .select(`
          id,
          pickup_address,
          destination_address,
          pickup_time,
          price,
          wheelchair_type,
          is_round_trip,
          additional_passengers,
          status,
          user_id,
          managed_client_id
        `)
        .gte('pickup_time', selectedMonth + '-01')
        .lt('pickup_time', selectedMonth.slice(0, 4) + '-' + String(parseInt(selectedMonth.slice(5, 7)) + 1).padStart(2, '0') + '-01')
        .not('price', 'is', null)
        .gt('price', 0)
        .order('pickup_time', { ascending: false });

      // Add user filtering
      if (facilityUserIds.length > 0) {
        query3 = query3.in('user_id', facilityUserIds);
      }
      
      const { data: trips3, error: error3 } = await query3;
      console.log('🚗 Attempt 3 result (no status filter):', { trips: trips3?.length || 0, error: error3?.message || 'none' });
      
      if (!error3 && trips3 && trips3.length > 0) {
        trips = trips3;
        console.log('✅ Found trips with Approach 3 (no status filter)!');
      }
    }

    // Calculate total amount
    const total = (trips || []).reduce((sum, trip) => {
      const price = parseFloat(trip.price) || 0;
      return sum + price;
    }, 0);
    
    console.log('💰 Calculated total:', total);
    
    // Set the data
    setMonthlyTrips(trips || []);
    setTotalAmount(total);
    
    // Handle success/error messages
    if (!trips || trips.length === 0) {
      console.log('🔍 No trips found, running final diagnostic...');
      
      // Final diagnostic: check if ANY trips exist for facility users
      const { data: anyTrips, error: anyTripsError } = await supabase
        .from('trips')
        .select('id, pickup_time, price, status, user_id')
        .in('user_id', facilityUserIds)
        .not('price', 'is', null)
        .gt('price', 0)
        .order('pickup_time', { ascending: false })
        .limit(10);
      
      if (!anyTripsError && anyTrips && anyTrips.length > 0) {
        console.log(`📊 Found ${anyTrips.length} trips in other months:`, anyTrips);
        
        // Show month distribution
        const monthCounts = {};
        anyTrips.forEach(trip => {
          const tripDate = new Date(trip.pickup_time);
          const monthKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });
        console.log('📊 Trips by month:', monthCounts);
        
        // Format selected month for display
        let selectedMonthDisplay;
        try {
          selectedMonthDisplay = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });
        } catch (err) {
          selectedMonthDisplay = selectedMonth;
        }
        
        setError(`No trips found for ${selectedMonthDisplay}. Found ${anyTrips.length} trips in other months. Check console for details.`);
      } else {
        console.log('❌ No trips found at all for facility users');
        setError('No trips found for this facility');
      }
    } else {
      console.log('✅ Trips found and displayed successfully!');
      setError(''); // Clear any previous errors
    }
    
  } catch (err) {
    console.error('Error fetching monthly trips:', err);
    setError('Failed to load monthly trip data');
    setMonthlyTrips([]);
    setTotalAmount(0);
  } finally {
    setLoading(false);
  }
};
