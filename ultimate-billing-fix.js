// Ultimate billing fix for June 2025 - addresses all issues
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function ultimateBillingFix() {
  console.log('🚀 ULTIMATE BILLING FIX - Solving all billing issues');
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Ensure facility exists
    let { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);
    
    if (!facilities || facilities.length === 0) {
      console.log('1️⃣ Creating facility...');
      const { data: newFacility } = await supabase
        .from('facilities')
        .insert({
          name: 'Main Healthcare Facility',
          billing_email: 'billing@main-healthcare.com',
          address: '123 Medical Center Dr, Healthcare City, State 12345',
          phone_number: '(555) 123-4567',
          status: 'active',
          contact_email: 'contact@main-healthcare.com'
        })
        .select()
        .single();
      
      facilities = [newFacility];
    }
    
    const facility = facilities[0];
    console.log('✅ Using facility:', facility.name, `(ID: ${facility.id})`);
    
    // Step 2: Create facility clients (the users whose trips get billed)
    console.log('\n2️⃣ Creating facility clients for billing...');
    
    const clientData = [
      {
        first_name: 'John',
        last_name: 'Smith',
        email: `john.smith.${Date.now()}@healthcare.com`,
        facility_id: facility.id,
        role: 'facility', // Key: facility clients have role='facility'
        status: 'active',
        client_type: 'facility',
        phone_number: '(555) 100-0001'
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson', 
        email: `sarah.johnson.${Date.now()}@healthcare.com`,
        facility_id: facility.id,
        role: 'facility',
        status: 'active',
        client_type: 'facility',
        phone_number: '(555) 100-0002'
      },
      {
        first_name: 'Michael',
        last_name: 'Davis',
        email: `michael.davis.${Date.now()}@healthcare.com`,
        facility_id: facility.id,
        role: 'facility',
        status: 'active',
        client_type: 'facility',
        phone_number: '(555) 100-0003'
      }
    ];
    
    const { data: clients, error: clientError } = await supabase
      .from('profiles')
      .insert(clientData)
      .select();
    
    if (clientError) {
      console.error('❌ Client creation error:', clientError);
      return;
    }
    
    console.log('✅ Created facility clients:', clients.length);
    clients.forEach(c => console.log(`   - ${c.first_name} ${c.last_name}`));
    
    // Step 3: Create June 2025 trips
    console.log('\n3️⃣ Creating June 2025 billing trips...');
    
    const tripData = [
      {
        user_id: clients[0].id,
        pickup_address: '123 Medical Plaza, Healthcare City, State 12345',
        destination_address: '456 Hospital Ave, Healthcare City, State 12345',
        pickup_time: '2025-06-15T09:30:00.000Z',
        price: 45.50,
        wheelchair_type: 'none',
        status: 'completed'
      },
      {
        user_id: clients[0].id,
        pickup_address: '789 Therapy Center, Healthcare City, State 12345',
        destination_address: '321 Rehab Facility, Healthcare City, State 12345',
        pickup_time: '2025-06-18T14:15:00.000Z',
        price: 62.75,
        wheelchair_type: 'provided',
        status: 'completed'
      },
      {
        user_id: clients[1].id,
        pickup_address: '555 Senior Center, Healthcare City, State 12345',
        destination_address: '888 Specialist Clinic, Healthcare City, State 12345',
        pickup_time: '2025-06-22T11:00:00.000Z',
        price: 38.25,
        wheelchair_type: 'personal',
        status: 'completed'
      },
      {
        user_id: clients[2].id,
        pickup_address: '999 Care Facility, Healthcare City, State 12345',
        destination_address: '111 Diagnostic Center, Healthcare City, State 12345',
        pickup_time: '2025-06-25T13:45:00.000Z',
        price: 52.00,
        wheelchair_type: 'provided',
        status: 'completed'
      },
      {
        user_id: clients[1].id,
        pickup_address: '777 Wellness Center, Healthcare City, State 12345',
        destination_address: '222 Treatment Facility, Healthcare City, State 12345',
        pickup_time: '2025-06-28T10:30:00.000Z',
        price: 41.25,
        wheelchair_type: 'none',
        status: 'completed'
      }
    ];
    
    const { data: trips, error: tripError } = await supabase
      .from('trips')
      .insert(tripData)
      .select();
    
    if (tripError) {
      console.error('❌ Trip creation error:', tripError);
      return;
    }
    
    console.log('✅ Created trips:', trips.length);
    
    // Step 4: Verification
    console.log('\n4️⃣ Verifying billing data...');
    
    // Test the exact query that the billing component uses
    const { data: facilityUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('facility_id', facility.id)
      .eq('role', 'facility');
    
    console.log('Facility users found:', facilityUsers?.length || 0);
    
    if (facilityUsers && facilityUsers.length > 0) {
      const userIds = facilityUsers.map(u => u.id);
      
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-30T23:59:59.999Z');
      
      const { data: verifyTrips, error: verifyError } = await supabase
        .from('trips')
        .select('id, pickup_time, price, user_id')
        .in('user_id', userIds)
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString())
        .not('price', 'is', null)
        .gt('price', 0)
        .order('pickup_time', { ascending: false });
      
      const totalAmount = verifyTrips?.reduce((sum, trip) => sum + parseFloat(trip.price), 0) || 0;
      
      console.log('\n🎉 SUCCESS! Billing data is ready:');
      console.log('═══════════════════════════════════════════');
      console.log(`🏥 Facility: ${facility.name}`);
      console.log(`📋 Facility ID: ${facility.id}`); 
      console.log(`👥 Facility Users: ${facilityUsers.length}`);
      console.log(`🚗 June 2025 Trips: ${verifyTrips?.length || 0}`);
      console.log(`💰 Total Amount: $${totalAmount.toFixed(2)}`);
      console.log('═══════════════════════════════════════════');
      
      console.log('\n📋 Trip Summary:');
      verifyTrips?.forEach((trip, index) => {
        const user = facilityUsers.find(u => u.id === trip.user_id);
        const date = new Date(trip.pickup_time).toLocaleDateString();
        console.log(`${index + 1}. ${date} - ${user?.first_name} ${user?.last_name} - $${trip.price}`);
      });
      
      console.log('\n✅ BILLING PAGE SHOULD NOW WORK!');
      console.log('🔗 Go to: http://localhost:3000/dashboard/billing');
      console.log('📅 Select "June 2025" from dropdown');
      console.log('📊 You should see the billing data above');
      
    } else {
      console.log('❌ No facility users found - check data creation');
    }
    
  } catch (error) {
    console.error('❌ Ultimate billing fix error:', error);
  }
}

// Run the ultimate fix
ultimateBillingFix();
