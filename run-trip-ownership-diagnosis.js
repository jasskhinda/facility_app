// Run trip ownership diagnosis in browser console
// Copy and paste this into the browser console on the billing page

(async () => {
  console.log('🔍 MULTI-APP TRIP OWNERSHIP DIAGNOSIS');
  console.log('=====================================');
  
  try {
    // 1. Check trip table structure
    console.log('\n1️⃣ CHECKING TRIP TABLE STRUCTURE...');
    
    const { data: sampleTrips, error: tripsError } = await window.supabase
      .from('trips')
      .select(`
        id,
        pickup_time,
        status,
        price,
        user_id,
        facility_id,
        created_by,
        booking_source,
        app_source,
        booked_by,
        managed_client_id
      `)
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z')
      .limit(5);
    
    if (tripsError) {
      console.log('❌ Error fetching trips:', tripsError);
    } else {
      console.log('✅ Sample trips structure:');
      sampleTrips?.forEach((trip, i) => {
        console.log(`Trip ${i + 1}:`, {
          id: trip.id.substring(0, 8) + '...',
          facility_id: trip.facility_id || 'NULL',
          user_id: trip.user_id.substring(0, 8) + '...',
          created_by: trip.created_by || 'NULL',
          booking_source: trip.booking_source || 'NULL',
          app_source: trip.app_source || 'NULL',
          booked_by: trip.booked_by || 'NULL',
          managed_client_id: trip.managed_client_id || 'NULL'
        });
      });
    }
    
    // 2. Check trip creation patterns
    console.log('\n2️⃣ ANALYZING TRIP CREATION PATTERNS...');
    
    const { data: patternAnalysis } = await window.supabase
      .from('trips')
      .select(`
        facility_id,
        user_id,
        profiles!trips_user_id_fkey(role, facility_id)
      `)
      .gte('pickup_time', '2025-06-01T00:00:00Z')
      .lt('pickup_time', '2025-07-01T00:00:00Z');
    
    if (patternAnalysis) {
      const patterns = {};
      patternAnalysis.forEach(trip => {
        const key = `trip_facility_id:${trip.facility_id || 'NULL'}_user_role:${trip.profiles?.role || 'NULL'}_user_facility_id:${trip.profiles?.facility_id || 'NULL'}`;
        patterns[key] = (patterns[key] || 0) + 1;
      });
      
      console.log('✅ Trip ownership patterns:');
      Object.entries(patterns).forEach(([pattern, count]) => {
        console.log(`   ${pattern} → ${count} trips`);
      });
    }
    
    // 3. Check facility booking form presence
    console.log('\n3️⃣ CHECKING FOR FACILITY BOOKING INDICATORS...');
    
    const { data: facilityTrips } = await window.supabase
      .from('trips')
      .select('*')
      .not('facility_id', 'is', null)
      .limit(1);
    
    console.log('✅ Trips with facility_id:', facilityTrips?.length || 0);
    
    // 4. Recommendation
    console.log('\n4️⃣ RECOMMENDATION:');
    if (facilityTrips?.length > 0) {
      console.log('✅ Database has facility_id field on trips');
      console.log('💡 SOLUTION: Filter trips by facility_id instead of user facility association');
      console.log('🔧 Change query from:');
      console.log('   WHERE user_id IN (SELECT id FROM profiles WHERE facility_id = ?)');
      console.log('🔧 Change to:');
      console.log('   WHERE facility_id = ?');
    } else {
      console.log('⚠️  No trips have facility_id set');
      console.log('💡 SOLUTION: Need to distinguish trip creation source');
      console.log('🔧 Options:');
      console.log('   1. Add facility_id to trips when created via FacilityBookingForm');
      console.log('   2. Add booking_source field to identify app source');
      console.log('   3. Use created_by or booked_by fields');
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
})();
