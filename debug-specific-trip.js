// Debug script to investigate the specific trip ad312c2a-05f0-4461-861e-cefa1ce8459f

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSpecificTrip() {
  const tripId = 'ad312c2a-05f0-4461-861e-cefa1ce8459f';
  
  console.log(`🔍 Investigating trip: ${tripId}`);
  console.log('=' + '='.repeat(60));
  
  // 1. Get the trip details
  console.log('\n1. Trip Details:');
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();
  
  if (tripError) {
    console.log('❌ Error fetching trip:', tripError.message);
    return;
  }
  
  if (!trip) {
    console.log('❌ Trip not found');
    return;
  }
  
  console.log('✅ Trip found:', {
    id: trip.id,
    status: trip.status,
    pickup_time: trip.pickup_time,
    price: trip.price,
    total_fare: trip.total_fare,
    facility_id: trip.facility_id,
    user_id: trip.user_id,
    managed_client_id: trip.managed_client_id,
    billable: trip.billable,
    created_at: trip.created_at
  });
  
  // 2. Check what month this trip is in
  const tripDate = new Date(trip.pickup_time);
  const tripMonth = tripDate.toISOString().slice(0, 7); // YYYY-MM format
  console.log('\n2. Trip Month:', {
    pickup_time: trip.pickup_time,
    tripDate: tripDate.toDateString(),
    tripMonth: tripMonth,
    isCurrentMonth: tripMonth === new Date().toISOString().slice(0, 7)
  });
  
  // 3. Check if this trip would be included in billing query
  console.log('\n3. Billing Query Test:');
  const [year, month] = tripMonth.split('-');
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
  const lastDayOfMonth = endDate.getDate();
  const startISO = `${year}-${month.padStart(2, '0')}-01T00:00:00.000Z`;
  const endISO = `${year}-${month.padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}T23:59:59.999Z`;
  
  console.log('Date range for billing query:', {
    startISO,
    endISO,
    tripPickupTime: trip.pickup_time,
    isInRange: trip.pickup_time >= startISO && trip.pickup_time <= endISO
  });
  
  // 4. Test the exact billing query used by the component
  console.log('\n4. Testing Billing Component Query:');
  const billingStatuses = ['completed', 'pending', 'upcoming', 'confirmed', 'approved', 'cancelled', 'canceled', 'rejected', 'no-show'];
  console.log('Status filter used:', billingStatuses);
  console.log('Trip status matches filter?', billingStatuses.includes(trip.status));
  
  // Run the exact query from the billing component
  const { data: billingTrips, error: billingError } = await supabase
    .from('trips')
    .select(`
      id,
      pickup_address,
      destination_address,
      pickup_time,
      pickup_date,
      price,
      total_fare,
      billable,
      wheelchair_type,
      is_round_trip,
      additional_passengers,
      status,
      user_id,
      managed_client_id
    `)
    .eq('facility_id', trip.facility_id)
    .in('status', billingStatuses)
    .gte('pickup_time', startISO)
    .lte('pickup_time', endISO)
    .order('pickup_time', { ascending: false });
  
  if (billingError) {
    console.log('❌ Billing query error:', billingError.message);
  } else {
    console.log(`✅ Billing query returned ${billingTrips?.length || 0} trips`);
    const targetTrip = billingTrips?.find(t => t.id === tripId);
    console.log('Target trip found in billing query?', targetTrip ? 'YES' : 'NO');
    
    if (targetTrip) {
      console.log('Target trip in billing results:', {
        id: targetTrip.id,
        status: targetTrip.status,
        pickup_time: targetTrip.pickup_time,
        price: targetTrip.price
      });
    } else {
      console.log('❌ Target trip NOT found in billing query results');
      
      // Let's check what statuses are actually in the results
      if (billingTrips && billingTrips.length > 0) {
        const statuses = [...new Set(billingTrips.map(t => t.status))];
        console.log('Actual statuses in billing results:', statuses);
      }
    }
  }
  
  // 5. Check if status is exactly "pending" vs "Pending Approval"
  console.log('\n5. Status Analysis:');
  console.log('Exact status value:', JSON.stringify(trip.status));
  console.log('Status length:', trip.status?.length);
  console.log('Status toLowerCase():', trip.status?.toLowerCase());
  console.log('Status includes "pending"?:', trip.status?.toLowerCase().includes('pending'));
  
  // 6. Check for any other trips with similar status
  console.log('\n6. Similar Status Check:');
  const { data: similarTrips, error: similarError } = await supabase
    .from('trips')
    .select('id, status, pickup_time, facility_id')
    .eq('facility_id', trip.facility_id)
    .limit(100);
  
  if (!similarError && similarTrips) {
    const statusCounts = {};
    similarTrips.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    console.log('All statuses for this facility:', statusCounts);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Investigation complete');
}

debugSpecificTrip().catch(console.error);
