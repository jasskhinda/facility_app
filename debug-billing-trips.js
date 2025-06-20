// Debug script to investigate billing trips issue
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugBillingTrips() {
  console.log('🔍 DEBUGGING BILLING TRIPS ISSUE');
  console.log('==================================');
  
  try {
    // 1. Check environment variables
    console.log('\n1. Environment Check:');
    console.log('   Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
    console.log('   Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
    
    // 2. Check if facilities table exists and has data
    console.log('\n2. Facilities Check:');
    const { data: facilities, error: facilityError } = await supabase
      .from('facilities')
      .select('id, name, billing_email')
      .limit(5);
    
    if (facilityError) {
      console.log('   ❌ Error fetching facilities:', facilityError);
    } else {
      console.log('   ✅ Found facilities:', facilities?.length || 0);
      facilities?.forEach(f => console.log(`      - ID: ${f.id}, Name: ${f.name}`));
    }
    
    // 3. Check if trips table exists and has data
    console.log('\n3. Trips Check:');
    const { data: allTrips, error: tripError } = await supabase
      .from('trips')
      .select('id, facility_id, pickup_time, price, status')
      .limit(10);
    
    if (tripError) {
      console.log('   ❌ Error fetching trips:', tripError);
    } else {
      console.log('   ✅ Found trips:', allTrips?.length || 0);
      allTrips?.forEach(t => console.log(`      - ID: ${t.id}, Facility: ${t.facility_id}, Status: ${t.status}, Price: $${t.price}`));
    }
    
    // 4. Check facility_id associations
    console.log('\n4. Facility-Trip Associations:');
    if (facilities?.length > 0 && allTrips?.length > 0) {
      const facilityIds = facilities.map(f => f.id);
      const tripFacilityIds = [...new Set(allTrips.map(t => t.facility_id))];
      
      console.log('   Facility IDs:', facilityIds);
      console.log('   Trip Facility IDs:', tripFacilityIds);
      
      const matches = facilityIds.filter(id => tripFacilityIds.includes(id));
      console.log('   Matching IDs:', matches);
      
      if (matches.length === 0) {
        console.log('   ⚠️  NO MATCHING FACILITY IDs - THIS IS THE PROBLEM!');
      }
    }
    
    // 5. Test specific facility query (use first facility ID)
    if (facilities?.length > 0) {
      const testFacilityId = facilities[0].id;
      console.log(`\n5. Testing Query for Facility ID: ${testFacilityId}`);
      
      // Current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      console.log('   Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      
      const { data: facilityTrips, error: queryError } = await supabase
        .from('trips')
        .select('id, pickup_address, destination_address, pickup_time, price, status')
        .eq('facility_id', testFacilityId)
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString())
        .in('status', ['completed', 'pending', 'upcoming']);
      
      if (queryError) {
        console.log('   ❌ Query error:', queryError);
      } else {
        console.log('   ✅ Query results:', facilityTrips?.length || 0, 'trips');
        facilityTrips?.forEach(t => console.log(`      - ${t.pickup_time} | $${t.price} | ${t.status}`));
      }
      
      // Test without date filter
      console.log('\n   Testing without date filter:');
      const { data: allFacilityTrips, error: noDateError } = await supabase
        .from('trips')
        .select('id, pickup_time, price, status')
        .eq('facility_id', testFacilityId);
      
      if (noDateError) {
        console.log('   ❌ No-date query error:', noDateError);
      } else {
        console.log('   ✅ All trips for facility:', allFacilityTrips?.length || 0);
      }
      
      // Test without status filter
      console.log('\n   Testing without status filter:');
      const { data: noStatusTrips, error: noStatusError } = await supabase
        .from('trips')
        .select('id, pickup_time, price, status')
        .eq('facility_id', testFacilityId)
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString());
      
      if (noStatusError) {
        console.log('   ❌ No-status query error:', noStatusError);
      } else {
        console.log('   ✅ Trips without status filter:', noStatusTrips?.length || 0);
        noStatusTrips?.forEach(t => console.log(`      - Status: ${t.status}`));
      }
    }
    
    // 6. Check table schema
    console.log('\n6. Schema Check:');
    const { data: tripsSchema, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'trips' })
      .limit(1);
    
    if (schemaError) {
      console.log('   ⚠️  Could not fetch schema (RPC not available)');
    } else {
      console.log('   ✅ Schema available');
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugBillingTrips();
