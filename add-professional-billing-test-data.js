#!/usr/bin/env node

/**
 * Add Professional Billing Test Data
 * Creates a mix of completed and pending trips for June 2025 to test the enhanced billing system
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addProfessionalBillingTestData() {
  console.log('🎯 Adding Professional Billing Test Data');
  console.log('=====================================');

  try {
    // 1. Find facility users
    console.log('\n1️⃣ Finding facility users...');
    const { data: facilityUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, facility_id')
      .not('facility_id', 'is', null)
      .eq('role', 'facility')
      .limit(5);

    if (usersError) {
      console.error('❌ Error finding facility users:', usersError.message);
      return;
    }

    if (!facilityUsers?.length) {
      console.log('⚠️ No facility users found. Creating test user...');
      
      // Create a test facility user
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          first_name: 'John',
          last_name: 'Facility',
          email: 'john.facility@test.com',
          role: 'facility',
          facility_id: 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' // Use existing facility ID
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test user:', createError.message);
        return;
      }

      facilityUsers = [newUser];
    }

    console.log(`✅ Found ${facilityUsers.length} facility users`);
    facilityUsers.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (Facility: ${user.facility_id})`);
    });

    // 2. Create mix of completed and pending trips for June 2025
    console.log('\n2️⃣ Creating professional billing test trips...');
    
    const testTrips = [
      // COMPLETED TRIPS (billable)
      {
        user_id: facilityUsers[0].id,
        pickup_address: '123 Medical Center Dr, Columbus, OH',
        destination_address: 'Ohio State Wexner Medical Center, Columbus, OH',
        pickup_time: '2025-06-15T10:30:00Z',
        status: 'completed',
        price: 45.50,
        wheelchair_type: 'no_wheelchair',
        is_round_trip: false,
        distance: 8.2,
        additional_passengers: 0
      },
      {
        user_id: facilityUsers[0].id,
        pickup_address: '456 Senior Living Way, Columbus, OH',
        destination_address: 'Mount Carmel East Hospital, Columbus, OH',
        pickup_time: '2025-06-18T14:15:00Z',
        status: 'completed',
        price: 62.75,
        wheelchair_type: 'wheelchair',
        is_round_trip: true,
        distance: 12.4,
        additional_passengers: 1
      },
      {
        user_id: facilityUsers[0].id,
        pickup_address: '789 Care Facility Blvd, Columbus, OH',
        destination_address: 'Nationwide Children\'s Hospital, Columbus, OH',
        pickup_time: '2025-06-20T09:45:00Z',
        status: 'completed',
        price: 38.25,
        wheelchair_type: 'no_wheelchair',
        is_round_trip: false,
        distance: 6.8,
        additional_passengers: 0
      },
      
      // PENDING TRIPS (not yet billable)
      {
        user_id: facilityUsers[0].id,
        pickup_address: '5050 Blazer Pkwy # 100, Dublin, OH 43017',
        destination_address: '5055 Blazer Pkwy #100, Dublin, OH 43017, USA',
        pickup_time: '2025-06-24T08:15:00Z',
        status: 'pending',
        price: null, // No price assigned yet
        wheelchair_type: 'no_wheelchair',
        is_round_trip: false,
        distance: 0.1,
        additional_passengers: 0
      },
      {
        user_id: facilityUsers[0].id,
        pickup_address: '555 Rehab Center Dr, Medical City',
        destination_address: '888 Family Home Ln, Suburbs',
        pickup_time: '2025-06-21T09:15:00Z',
        status: 'pending',
        price: null, // No price assigned yet
        wheelchair_type: 'no_wheelchair',
        is_round_trip: false,
        distance: 5.5,
        additional_passengers: 0
      },
      
      // UPCOMING TRIPS (scheduled but not completed)
      {
        user_id: facilityUsers[0].id,
        pickup_address: '321 Therapy Center Ave, Downtown',
        destination_address: '654 Patient Home St, Hometown',
        pickup_time: '2025-06-25T16:30:00Z',
        status: 'upcoming',
        price: 29.50, // Pre-priced
        wheelchair_type: 'manual',
        is_round_trip: false,
        distance: 4.2,
        additional_passengers: 0
      }
    ];

    // Add more trips for other users if available
    if (facilityUsers.length > 1) {
      testTrips.push({
        user_id: facilityUsers[1].id,
        pickup_address: '999 Senior Living Complex, Medical City',
        destination_address: '111 Specialist Office, Medical Plaza',
        pickup_time: '2025-06-22T11:45:00Z',
        status: 'completed',
        price: 29.00,
        wheelchair_type: 'no_wheelchair',
        is_round_trip: false,
        distance: 3.1,
        additional_passengers: 0
      });
    }

    // Insert trips
    const { data: createdTrips, error: tripsError } = await supabase
      .from('trips')
      .upsert(testTrips, { 
        onConflict: 'pickup_time,user_id',
        ignoreDuplicates: true 
      })
      .select();

    if (tripsError) {
      console.error('❌ Error creating trips:', tripsError.message);
      return;
    }

    console.log(`✅ Created ${createdTrips?.length || testTrips.length} test trips`);

    // 3. Verify billing data
    console.log('\n3️⃣ Verifying billing data...');
    
    const completedTrips = testTrips.filter(trip => trip.status === 'completed' && trip.price > 0);
    const pendingTrips = testTrips.filter(trip => trip.status === 'pending');
    const upcomingTrips = testTrips.filter(trip => trip.status === 'upcoming');
    
    const totalBillable = completedTrips.reduce((sum, trip) => sum + (trip.price || 0), 0);

    console.log(`✅ Data Summary:`);
    console.log(`   - Total trips: ${testTrips.length}`);
    console.log(`   - Completed (billable): ${completedTrips.length} trips = $${totalBillable.toFixed(2)}`);
    console.log(`   - Pending approval: ${pendingTrips.length} trips`);
    console.log(`   - Upcoming: ${upcomingTrips.length} trips`);

    console.log('\n🎉 Professional Billing Test Data Added Successfully!');
    console.log('\n📋 What to test now:');
    console.log('   1. Visit the billing page: http://localhost:3000/dashboard/billing');
    console.log('   2. Select June 2025 from the dropdown');
    console.log('   3. Verify you see:');
    console.log(`      - ${testTrips.length} total trips`);
    console.log(`      - $${totalBillable.toFixed(2)} billable amount`);
    console.log(`      - ${pendingTrips.length} pending trips`);
    console.log('   4. Test the professional invoice generation');
    console.log('   5. Test the enhanced trip status display');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
addProfessionalBillingTestData().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
