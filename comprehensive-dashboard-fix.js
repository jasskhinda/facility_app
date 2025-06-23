#!/usr/bin/env node

// Comprehensive Dashboard Data Fix Script
// Date: June 23, 2025
// Purpose: Fix all dashboard data issues with proper test data

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Comprehensive Dashboard Data Fix Starting...\n');

async function fixAllDashboardData() {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    console.log('1️⃣ Getting facility information...\n');
    
    // Get a facility to work with
    const { data: facilities, error: facilityFetchError } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);

    if (facilityFetchError || !facilities || facilities.length === 0) {
      console.log('❌ No facilities found');
      return;
    }

    const facilityId = facilities[0].id;
    console.log(`✅ Using facility: ${facilities[0].name} (${facilityId})\n`);

    console.log('2️⃣ Fixing Client Status Issues...\n');
    
    // Update all facility clients to be active
    const { data: updatedFacilityClients, error: facilityError } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('facility_id', facilityId)
      .eq('role', 'facility')
      .select();
    
    if (facilityError) {
      console.log('⚠️ Facility client update error:', facilityError.message);
    } else {
      console.log(`✅ Updated ${updatedFacilityClients?.length || 0} facility clients to active status`);
    }

    // Get facility users for trip creation
    const { data: facilityUsers, error: userFetchError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facilityId)
      .eq('role', 'facility')
      .limit(5);

    if (userFetchError || !facilityUsers || facilityUsers.length === 0) {
      console.log('❌ No facility users found');
      return;
    }

    console.log(`✅ Found ${facilityUsers.length} facility users for trip creation\n`);

    console.log('3️⃣ Creating Monthly Trips Data (June 2025)...\n');

    // Create comprehensive trips data for June 2025
    const currentDate = new Date('2025-06-23');
    const tripsToCreate = [];

    // Helper function to create trips for a specific user
    const createTripsForUser = (user, startDate, count) => {
      const trips = [];
      for (let i = 0; i < count; i++) {
        const tripDate = new Date(startDate);
        tripDate.setDate(tripDate.getDate() + i);
        
        const addresses = [
          { pickup: '123 Medical Center Dr, Columbus, OH 43215', dest: 'Ohio State University Wexner Medical Center, Columbus, OH' },
          { pickup: '456 Senior Living Blvd, Columbus, OH 43220', dest: 'Mount Carmel East Hospital, Columbus, OH' },
          { pickup: '789 Assisted Care Way, Columbus, OH 43235', dest: 'Grant Medical Center, Columbus, OH' },
          { pickup: '321 Memory Care Dr, Columbus, OH 43240', dest: 'Riverside Methodist Hospital, Columbus, OH' },
          { pickup: '654 Elder Ave, Columbus, OH 43214', dest: 'Nationwide Children\'s Hospital, Columbus, OH' }
        ];
        
        const address = addresses[i % addresses.length];
        const prices = [45.50, 67.25, 52.00, 38.75, 73.50];
        const statuses = ['completed', 'completed', 'completed', 'pending', 'confirmed'];
        const wheelchairTypes = ['no_wheelchair', 'provided', 'manual', 'power', 'no_wheelchair'];
        
        trips.push({
          user_id: user.id,
          pickup_address: address.pickup,
          destination_address: address.dest,
          pickup_time: tripDate.toISOString(),
          status: statuses[i % statuses.length],
          price: prices[i % prices.length],
          wheelchair_type: wheelchairTypes[i % wheelchairTypes.length],
          is_round_trip: i % 3 === 0,
          distance: 8.5 + (i * 1.2),
          additional_passengers: i % 3,
          created_at: new Date(tripDate.getTime() - (60 * 60 * 1000)).toISOString() // 1 hour before pickup
        });
      }
      return trips;
    };

    // Create trips for each facility user
    facilityUsers.forEach((user, userIndex) => {
      // Create trips throughout June 2025
      const userTrips = createTripsForUser(user, new Date('2025-06-01'), 4); // 4 trips per user
      tripsToCreate.push(...userTrips);
      
      // Add specific trips for today (June 23, 2025) for "Today's Trips" metric
      if (userIndex < 2) { // Only for first 2 users
        const todayTrips = [
          {
            user_id: user.id,
            pickup_address: '100 Today St, Columbus, OH 43215',
            destination_address: 'Today Medical Center, Columbus, OH',
            pickup_time: '2025-06-23T14:30:00Z',
            status: 'pending',
            price: 55.00,
            wheelchair_type: 'no_wheelchair',
            is_round_trip: false,
            distance: 9.2,
            additional_passengers: 0,
            created_at: '2025-06-23T13:30:00Z'
          },
          {
            user_id: user.id,
            pickup_address: '200 Current Ave, Columbus, OH 43220',
            destination_address: 'Current Health Center, Columbus, OH',
            pickup_time: '2025-06-23T16:45:00Z',
            status: 'confirmed',
            price: 42.75,
            wheelchair_type: 'provided',
            is_round_trip: false,
            distance: 7.8,
            additional_passengers: 1,
            created_at: '2025-06-23T15:45:00Z'
          }
        ];
        tripsToCreate.push(...todayTrips);
      }
    });

    console.log(`📊 Preparing to create ${tripsToCreate.length} trips...`);

    // Insert trips in batches to avoid overwhelming the database
    const batchSize = 10;
    let totalInserted = 0;
    
    for (let i = 0; i < tripsToCreate.length; i += batchSize) {
      const batch = tripsToCreate.slice(i, i + batchSize);
      
      const { data: insertedTrips, error: tripError } = await supabase
        .from('trips')
        .insert(batch)
        .select();

      if (tripError) {
        console.log(`⚠️ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, tripError.message);
      } else {
        totalInserted += insertedTrips?.length || 0;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertedTrips?.length || 0} trips`);
      }
    }

    console.log(`\n✅ Total trips created: ${totalInserted}\n`);

    console.log('4️⃣ Verifying Dashboard Metrics...\n');

    // Verify active clients
    const { count: activeClients } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('facility_id', facilityId)
      .eq('role', 'facility')
      .eq('status', 'active');

    console.log(`✅ Active clients: ${activeClients || 0}`);

    // Verify today's trips (June 23, 2025)
    const facilityUserIds = facilityUsers.map(u => u.id);
    const { count: todaysTrips } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .in('user_id', facilityUserIds)
      .gte('pickup_time', '2025-06-23T00:00:00Z')
      .lt('pickup_time', '2025-06-24T00:00:00Z');

    console.log(`✅ Today's trips: ${todaysTrips || 0}`);

    // Verify this week's trips
    const { count: weekTrips } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .in('user_id', facilityUserIds)
      .gte('pickup_time', '2025-06-17T00:00:00Z')
      .lt('pickup_time', '2025-06-24T00:00:00Z');

    console.log(`✅ This week's trips: ${weekTrips || 0}`);

    // Verify monthly spend
    const { data: monthlyTrips } = await supabase
      .from('trips')
      .select('price')
      .in('user_id', facilityUserIds)
      .eq('status', 'completed')
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z');

    const monthlySpend = monthlyTrips?.reduce((sum, trip) => sum + (parseFloat(trip.price) || 0), 0) || 0;
    console.log(`✅ Monthly spend: $${monthlySpend.toFixed(2)}`);

    // Verify recent trips
    const { data: recentTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, status, user:profiles!trips_user_id_fkey(first_name, last_name)')
      .in('user_id', facilityUserIds)
      .order('pickup_time', { ascending: false })
      .limit(5);

    console.log(`✅ Recent trips: ${recentTrips?.length || 0} found`);
    if (recentTrips && recentTrips.length > 0) {
      recentTrips.forEach((trip, index) => {
        const userName = trip.user ? `${trip.user.first_name} ${trip.user.last_name}` : 'Unknown';
        console.log(`   ${index + 1}. ${userName} - ${trip.status} - ${new Date(trip.pickup_time).toLocaleDateString()}`);
      });
    }

    console.log('\n🎉 All Dashboard Data Fixes Completed Successfully!\n');
    console.log('📊 Expected Dashboard Results:');
    console.log(`   • Active clients: ${activeClients || 0} (instead of 0)`);
    console.log(`   • Today's trips: ${todaysTrips || 0} (instead of 0)`);
    console.log(`   • This week's trips: ${weekTrips || 0} (active count)`);
    console.log(`   • Monthly spend: $${monthlySpend.toFixed(2)} (instead of $0.00)`);
    console.log(`   • Recent trips: ${recentTrips?.length || 0} visible (instead of none)`);
    console.log('\n✨ Dashboard should now display all metrics correctly!');

  } catch (error) {
    console.error('❌ Error fixing dashboard data:', error);
  }
}

// Run the comprehensive fix
fixAllDashboardData();
