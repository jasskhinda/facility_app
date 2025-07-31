// Fix July 2025 billing display issue
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixJulyBilling() {
  console.log('🔧 Fixing July 2025 billing display...\n');

  try {
    // Step 1: Find all July trips (using pickup_time for accurate month detection)
    console.log('1️⃣ Finding all July 2025 trips...');
    
    const { data: julyTrips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .gte('pickup_time', '2025-07-01T00:00:00')
      .lt('pickup_time', '2025-08-01T00:00:00')
      .not('facility_id', 'is', null);

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }

    console.log(`📋 Found ${julyTrips.length} facility trips in July 2025`);

    // Step 2: Update each trip to ensure it has correct billing fields
    let updatedCount = 0;
    
    for (const trip of julyTrips) {
      const updates = {};
      let needsUpdate = false;

      // Ensure billable is set for completed trips
      if (trip.status === 'completed' && trip.billable !== true) {
        updates.billable = true;
        needsUpdate = true;
      }

      // Ensure total_fare matches price
      if (trip.price && (!trip.total_fare || trip.total_fare !== trip.price)) {
        updates.total_fare = trip.price;
        needsUpdate = true;
      }

      // Ensure pickup_date is set
      if (!trip.pickup_date && trip.pickup_time) {
        updates.pickup_date = new Date(trip.pickup_time).toISOString().split('T')[0];
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('trips')
          .update(updates)
          .eq('id', trip.id);

        if (updateError) {
          console.error(`❌ Error updating trip ${trip.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Updated trip ${trip.id}:`, updates);
        }
      }
    }

    console.log(`\n✅ Updated ${updatedCount} trips`);

    // Step 3: Verify specific facilities
    console.log('\n3️⃣ Checking specific facilities...');
    
    const facilityIds = [
      'c782252e-1a2b-4740-9bd7-e4fdf8d565a1', // Green Valley Medical Center
      'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'  // Jass Facility
    ];

    for (const facilityId of facilityIds) {
      const { data: facility } = await supabase
        .from('facilities')
        .select('name')
        .eq('id', facilityId)
        .single();

      const facilityTrips = julyTrips.filter(t => t.facility_id === facilityId);
      const completedTrips = facilityTrips.filter(t => t.status === 'completed');
      const totalAmount = completedTrips.reduce((sum, t) => sum + (parseFloat(t.total_fare || t.price || 0)), 0);

      console.log(`\n🏥 ${facility?.name || facilityId}:`);
      console.log(`   - Total July trips: ${facilityTrips.length}`);
      console.log(`   - Completed trips: ${completedTrips.length}`);
      console.log(`   - Total billable: $${totalAmount.toFixed(2)}`);
      
      if (completedTrips.length > 0) {
        console.log('   - Trip details:');
        completedTrips.forEach(trip => {
          const pickupDate = new Date(trip.pickup_time).toLocaleDateString();
          console.log(`     • ${trip.id.substring(0, 8)}: ${pickupDate} - $${trip.total_fare || trip.price || 0}`);
        });
      }
    }

    // Step 4: Display summary
    console.log('\n📊 July 2025 Billing Summary:');
    console.log('============================');
    
    const completedJulyTrips = julyTrips.filter(t => t.status === 'completed');
    const billableJulyTrips = julyTrips.filter(t => t.billable === true);
    const totalJulyAmount = completedJulyTrips.reduce((sum, t) => sum + (parseFloat(t.total_fare || t.price || 0)), 0);
    
    console.log(`Total facility trips: ${julyTrips.length}`);
    console.log(`Completed trips: ${completedJulyTrips.length}`);
    console.log(`Billable trips: ${billableJulyTrips.length}`);
    console.log(`Total billable amount: $${totalJulyAmount.toFixed(2)}`);

    console.log('\n🎉 Fix completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Clear your browser cache (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. Go to https://facility.compassionatecaretransportation.com/dashboard/billing');
    console.log('3. Make sure July 2025 is selected');
    console.log('4. Your trips should now appear with correct amounts');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixJulyBilling();