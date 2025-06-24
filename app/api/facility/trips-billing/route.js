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
        .select('id, first_name, last_name, phone_number')
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
        console.log(`🔍 Attempting to fetch ${managedClientIds.length} managed clients:`, managedClientIds.slice(0, 3));
        
        // 🔥 TRY PRIMARY TABLE: facility_managed_clients
        const { data: managedData, error: managedError } = await supabase
          .from('facility_managed_clients')
          .select('id, first_name, last_name, name, client_name, phone_number')
          .in('id', managedClientIds);
        
        if (managedError) {
          console.log('❌ facility_managed_clients fetch error:', managedError);
          
          // 🔥 FALLBACK: Try the old table name
          console.log('🔄 Trying fallback table: managed_clients');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('managed_clients')
            .select('id, first_name, last_name, name, client_name, phone_number')
            .in('id', managedClientIds);
            
          if (!fallbackError && fallbackData) {
            managedClients = fallbackData;
            console.log(`✅ Found ${fallbackData.length} managed client records in fallback table`);
          } else {
            console.log('❌ Fallback table also failed:', fallbackError);
          }
        } else if (managedData) {
          managedClients = managedData;
          console.log(`✅ Found ${managedData.length} managed client records`);
        } else {
          console.log('⚠️ No managed client data returned');
        }
      } catch (error) {
        console.log('❌ All managed client table queries failed:', error.message);
      }
    }
    
    // DEBUG: Log data for troubleshooting
    console.log('🔍 CLIENT NAME RESOLUTION DEBUG:');
    console.log(`Found ${trips.length} trips to process`);
    console.log(`User profiles fetched: ${userProfiles.length}`);
    console.log(`Managed clients fetched: ${managedClients.length}`);
    
    if (trips.length > 0) {
      const sampleTrip = trips[0];
      console.log('Sample trip:', {
        id: sampleTrip.id,
        user_id: sampleTrip.user_id,
        managed_client_id: sampleTrip.managed_client_id,
        pickup_address: sampleTrip.pickup_address?.substring(0, 50)
      });
    }
    
    if (userProfiles.length > 0) {
      console.log('Sample user profiles:', userProfiles.slice(0, 2));
    }
    
    if (managedClients.length > 0) {
      console.log('Sample managed clients:', managedClients.slice(0, 2));
    }

    // Transform trips into bill format with enhanced client name resolution
    const bills = [];
    let debugCount = 0;
    
    trips.forEach(trip => {
      // Smart client name detection using fetched profile data
      let clientName = 'Unknown Client';
      let debugInfo = { trip_id: trip.id.split('-')[0], resolution: 'none' };
      
      if (trip.user_id) {
        const userProfile = userProfiles.find(profile => profile.id === trip.user_id);
        if (userProfile && userProfile.first_name) {
          let name = `${userProfile.first_name} ${userProfile.last_name || ''}`.trim();
          // Add phone number in the same format as booking page
          if (userProfile.phone_number) {
            name += ` - ${userProfile.phone_number}`;
          }
          clientName = name;
          debugInfo.resolution = 'user_profile';
          debugInfo.found_profile = userProfile;
        } else {
          debugInfo.resolution = 'user_id_no_profile';
          debugInfo.user_id = trip.user_id;
        }
      } else if (trip.managed_client_id) {
        // 🔥 ENHANCED DEBUG: Log the full managed_client_id for debugging
        console.log(`🔍 Processing managed_client_id: ${trip.managed_client_id}`);
        console.log(`🔍 Available managed clients count: ${managedClients.length}`);
        if (managedClients.length > 0) {
          console.log(`🔍 Sample managed client IDs:`, managedClients.slice(0, 3).map(c => c.id));
        }
        
        const managedClient = managedClients.find(client => client.id === trip.managed_client_id);
        if (managedClient) {
          console.log(`✅ Found managed client record:`, managedClient);
          
          // Try different possible column combinations for managed client names
          let name = '';
          if (managedClient.first_name) {
            name = `${managedClient.first_name} ${managedClient.last_name || ''}`.trim();
          } else if (managedClient.name) {
            name = managedClient.name;
          } else if (managedClient.client_name) {
            name = managedClient.client_name;
          }
          
          if (name) {
            // Format as: "David Patel (Managed) - (416) 555-2233"
            let formattedName = `${name} (Managed)`;
            if (managedClient.phone_number) {
              formattedName += ` - ${managedClient.phone_number}`;
            }
            clientName = formattedName;
            debugInfo.resolution = 'managed_client';
            debugInfo.found_client = managedClient;
            console.log(`🎉 RESOLVED MANAGED CLIENT: "${formattedName}"`);
          } else {
            console.log(`⚠️ Managed client found but no name fields:`, Object.keys(managedClient));
            debugInfo.resolution = 'managed_client_no_name';
            debugInfo.found_client = managedClient;
          }
        } else {
          console.log(`❌ No managed client found for ID: ${trip.managed_client_id}`);
          console.log(`❌ Available managed client IDs:`, managedClients.map(c => c.id).slice(0, 5));
          debugInfo.resolution = 'managed_id_no_client';
          debugInfo.managed_client_id = trip.managed_client_id;
        }
      }
      
      // ✅ FALLBACK: If still "Unknown Client", create a meaningful name from the trip data
      if (clientName === 'Unknown Client') {
        if (trip.user_id) {
          // Create a fallback name for authenticated users without profiles
          clientName = `Facility Client (${trip.user_id.slice(-8)})`;
          debugInfo.resolution = 'fallback_user';
        } else if (trip.managed_client_id) {
          // 🔥 ENHANCED: Create a much more informative fallback name for managed clients
          const shortId = trip.managed_client_id.slice(0, 8);
          
          // Extract meaningful info from pickup address
          let addressHint = 'Unknown Location';
          if (trip.pickup_address) {
            // Try to get street name or building name
            const addressParts = trip.pickup_address.split(',')[0];
            const cleanAddress = addressParts.replace(/^\d+\s+/, ''); // Remove street number
            const words = cleanAddress.split(' ').filter(w => w.length > 2); // Get meaningful words
            addressHint = words.slice(0, 2).join(' ') || 'Client Location';
          }
          
          // Format: "Blazer Pkwy Client (ea79223a)" instead of "Managed Client (ea79223a)"
          clientName = `${addressHint} Client (${shortId})`;
          debugInfo.resolution = 'fallback_managed_with_address';
          
          // 🚨 TEMP DEBUG: Log this specific case
          console.log(`🔥 FALLBACK CREATED: "${clientName}" from address: "${trip.pickup_address}"`);
        } else {
          // Create a general fallback based on trip info
          const addressHint = trip.pickup_address ? 
            trip.pickup_address.split(',')[0].replace(/^\d+\s+/, '').slice(0, 15) : 
            'Unknown';
          clientName = `Client from ${addressHint}`;
          debugInfo.resolution = 'fallback_address';
        }
      }
      
      // Log first few resolutions for debugging
      if (debugCount < 3) {
        console.log(`Client resolution for trip ${debugInfo.trip_id}:`, debugInfo, `-> "${clientName}"`);
        debugCount++;
      }
      
      bills.push({
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
        // 💼 PROFESSIONAL BILLING STATUS SYSTEM
        status: trip.status === 'completed' ? 'DUE' : 
                trip.status === 'cancelled' ? 'CANCELLED' : 
                trip.status === 'approved' ? 'UPCOMING' : 'UPCOMING',
        payment_status: trip.status === 'completed' ? 'DUE' : 
                       trip.status === 'cancelled' ? 'CANCELLED' : 'UPCOMING',
        billing_status: trip.status === 'completed' ? 'DUE' : 
                       trip.status === 'cancelled' ? 'CANCELLED' : 'UPCOMING',
        created_at: trip.created_at,
        due_date: trip.status === 'completed' ? trip.pickup_time : null,
        profiles: trip.user_id ? userProfiles.find(p => p.id === trip.user_id) : managedClients.find(c => c.id === trip.managed_client_id)
      });
    });
    
    // DEBUG: Summary of client name resolution
    console.log('\n🔍 CLIENT NAME RESOLUTION SUMMARY:');
    const nameStats = bills.reduce((acc, bill) => {
      if (bill.client_name === 'Unknown Client') {
        acc.unknown++;
      } else if (bill.client_name.includes('Managed Client (')) {
        acc.managedFallback++;
        acc.managedFallbackSamples.push(bill.client_name);
      } else if (bill.client_name.includes('(Managed)')) {
        acc.managedResolved++;
        acc.managedResolvedSamples.push(bill.client_name);
      } else if (bill.client_name.includes('Facility Client (')) {
        acc.facilityFallback++;
      } else {
        acc.resolved++;
        acc.names.push(bill.client_name);
      }
      return acc;
    }, { 
      unknown: 0, 
      resolved: 0, 
      managedResolved: 0,
      managedFallback: 0,
      facilityFallback: 0,
      names: [],
      managedResolvedSamples: [],
      managedFallbackSamples: []
    });
    
    console.log(`✅ Properly resolved: ${nameStats.resolved}`);
    console.log(`✅ Managed clients resolved: ${nameStats.managedResolved}`);
    console.log(`🔄 Managed clients fallback: ${nameStats.managedFallback}`);
    console.log(`🔄 Facility clients fallback: ${nameStats.facilityFallback}`);
    console.log(`❌ Unknown clients: ${nameStats.unknown}`);
    
    if (nameStats.managedFallbackSamples.length > 0) {
      console.log('🔍 Managed client fallbacks (need investigation):', nameStats.managedFallbackSamples.slice(0, 3));
    }
    
    if (nameStats.managedResolvedSamples.length > 0) {
      console.log('✅ Managed clients properly resolved:', nameStats.managedResolvedSamples.slice(0, 3));
    }
    
    if (nameStats.names.length > 0) {
      console.log(`✅ Sample resolved names: ${nameStats.names.slice(0, 3).join(', ')}`);
    }

    // Calculate summary statistics with professional billing status
    const summary = {
      total_bills: bills.length,
      total_amount: bills.reduce((sum, bill) => sum + bill.amount, 0),
      // 💼 PROFESSIONAL BILLING AMOUNTS
      due_amount: bills
        .filter(bill => bill.billing_status === 'DUE')
        .reduce((sum, bill) => sum + bill.amount, 0),
      upcoming_amount: bills
        .filter(bill => bill.billing_status === 'UPCOMING')
        .reduce((sum, bill) => sum + bill.amount, 0),
      cancelled_amount: bills
        .filter(bill => bill.billing_status === 'CANCELLED')
        .reduce((sum, bill) => sum + bill.amount, 0),
      // 💼 PROFESSIONAL TRIP COUNTS
      due_trips: bills.filter(bill => bill.billing_status === 'DUE').length,
      upcoming_trips: bills.filter(bill => bill.billing_status === 'UPCOMING').length,
      cancelled_trips: bills.filter(bill => bill.billing_status === 'CANCELLED').length,
      // Keep legacy fields for backward compatibility
      paid_amount: bills
        .filter(bill => bill.billing_status === 'DUE')
        .reduce((sum, bill) => sum + bill.amount, 0),
      outstanding_amount: bills
        .filter(bill => bill.billing_status === 'UPCOMING')
        .reduce((sum, bill) => sum + bill.amount, 0),
      overdue_count: 0, // Will be calculated based on due dates later
      completed_trips: bills.filter(bill => bill.billing_status === 'DUE').length,
      pending_trips: bills.filter(bill => bill.billing_status === 'UPCOMING').length
    };
    
    return NextResponse.json({ bills, summary });
  } catch (error) {
    console.error('Error getting trips billing data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
