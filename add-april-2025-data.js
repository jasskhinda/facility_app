// Quick fix for April 2025 billing data
// Run this in browser console or terminal

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function addApril2025Data() {
  console.log('🗓️ Adding April 2025 billing data...');
  
  try {
    // Get facility
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    if (!facilities || facilities.length === 0) {
      console.log('❌ No facilities found');
      return;
    }
    
    const facility = facilities[0];
    console.log('🏥 Using facility:', facility.name);
    
    // Get or create facility users
    let { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');
    
    if (!users || users.length === 0) {
      console.log('👤 Creating facility users...');
      
      const { data: newUsers } = await supabase
        .from('profiles')
        .insert([
          {
            first_name: 'Sarah',
            last_name: 'Wilson',
            email: `sarah.wilson.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active',
            client_type: 'facility'
          },
          {
            first_name: 'Robert',
            last_name: 'Chen',
            email: `robert.chen.${Date.now()}@facility.com`,
            facility_id: facility.id,
            role: 'facility',
            status: 'active',
            client_type: 'facility'
          }
        ])
        .select();
      
      users = newUsers;
    }
    
    console.log('✅ Using', users.length, 'facility users');
    
    // Create April 2025 trips
    const aprilTrips = [
      {
        user_id: users[0].id,
        pickup_address: '123 Spring Medical Center, Healthcare City, State 12345',
        destination_address: '456 April Clinic Dr, Healthcare City, State 12345',
        pickup_time: '2025-04-10T10:00:00.000Z',
        price: 42.75,
        wheelchair_type: 'none',
        status: 'completed',
        is_round_trip: false,
        additional_passengers: 0
      },
      {
        user_id: users[0].id,
        pickup_address: '789 Wellness Center Ave, Healthcare City, State 12345',
        destination_address: '321 Therapy Facility St, Healthcare City, State 12345',
        pickup_time: '2025-04-15T14:30:00.000Z',
        price: 55.25,
        wheelchair_type: 'provided',
        status: 'completed',
        is_round_trip: true,
        additional_passengers: 1
      },
      {
        user_id: users.length > 1 ? users[1].id : users[0].id,
        pickup_address: '555 Senior Care Blvd, Healthcare City, State 12345',
        destination_address: '888 Specialist Center Dr, Healthcare City, State 12345',
        pickup_time: '2025-04-20T11:15:00.000Z',
        price: 38.50,
        wheelchair_type: 'personal',
        status: 'completed',
        is_round_trip: false,
        additional_passengers: 0
      },
      {
        user_id: users[0].id,
        pickup_address: '999 Recovery Center Way, Healthcare City, State 12345',
        destination_address: '111 Diagnostic Lab Ave, Healthcare City, State 12345',
        pickup_time: '2025-04-25T09:45:00.000Z',
        price: 47.00,
        wheelchair_type: 'none',
        status: 'completed',
        is_round_trip: false,
        additional_passengers: 2
      }
    ];
    
    const { data: createdTrips, error: tripError } = await supabase
      .from('trips')
      .insert(aprilTrips)
      .select();
    
    if (tripError) {
      console.error('❌ Error creating trips:', tripError);
      return;
    }
    
    const totalAmount = aprilTrips.reduce((sum, trip) => sum + trip.price, 0);
    
    console.log('🎉 SUCCESS! April 2025 data created:');
    console.log(`📊 Trips: ${createdTrips.length}`);
    console.log(`💰 Total: $${totalAmount.toFixed(2)}`);
    console.log('✅ Refresh the billing page and select April 2025');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  addApril2025Data();
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.addApril2025Data = addApril2025Data;
}
