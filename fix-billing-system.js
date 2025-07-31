// Comprehensive billing system fix script
// Run this to fix the $0.00 billing amounts issue

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please ensure .env.local contains:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBillingSystem() {
  console.log('🔧 Starting billing system fix...\n');

  try {
    // Step 1: Add missing columns
    console.log('1️⃣ Adding missing database columns...');
    
    const schemaFixes = `
      -- Add missing columns to trips table
      DO $$ 
      BEGIN
          -- Add billable column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'trips' AND column_name = 'billable') THEN
              ALTER TABLE trips ADD COLUMN billable BOOLEAN DEFAULT FALSE;
              RAISE NOTICE 'Added billable column to trips table';
          END IF;
          
          -- Add total_fare column if it doesn't exist (as alias for price)
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'trips' AND column_name = 'total_fare') THEN
              ALTER TABLE trips ADD COLUMN total_fare DECIMAL(10,2);
              RAISE NOTICE 'Added total_fare column to trips table';
          END IF;
          
          -- Add pickup_date column if it doesn't exist (for billing queries)
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'trips' AND column_name = 'pickup_date') THEN
              ALTER TABLE trips ADD COLUMN pickup_date DATE;
              RAISE NOTICE 'Added pickup_date column to trips table';
          END IF;
      END $$;
    `;

    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaFixes });
    if (schemaError) {
      console.error('❌ Schema fix error:', schemaError);
    } else {
      console.log('✅ Database schema updated successfully');
    }

    // Step 2: Fix existing trip data
    console.log('\n2️⃣ Fixing existing trip data...');

    // Get all trips that need fixing
    const { data: tripsToFix, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .or('billable.is.null,total_fare.is.null,pickup_date.is.null');

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }

    console.log(`📋 Found ${tripsToFix.length} trips that need fixing`);

    // Step 3: Update each trip
    let fixedCount = 0;
    for (const trip of tripsToFix) {
      const updates = {};
      
      // Set billable status
      if (trip.billable === null || trip.billable === undefined) {
        updates.billable = trip.status === 'completed' && trip.facility_id !== null;
      }
      
      // Set total_fare from price
      if (!trip.total_fare && trip.price) {
        updates.total_fare = trip.price;
      } else if (!trip.total_fare && !trip.price && trip.distance > 0) {
        // Calculate fare from distance (base rate $2.50/mile, minimum $25)
        updates.total_fare = Math.max(trip.distance * 2.50, 25.00);
        updates.price = updates.total_fare; // Also update price
      }
      
      // Set pickup_date from pickup_time
      if (!trip.pickup_date && trip.pickup_time) {
        updates.pickup_date = new Date(trip.pickup_time).toISOString().split('T')[0];
      }

      // Apply updates if there are any
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('trips')
          .update(updates)
          .eq('id', trip.id);

        if (updateError) {
          console.error(`❌ Error updating trip ${trip.id}:`, updateError);
        } else {
          fixedCount++;
          console.log(`✅ Fixed trip ${trip.id}: ${JSON.stringify(updates)}`);
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} trips successfully`);

    // Step 4: Create billing index for performance
    console.log('\n3️⃣ Creating billing performance index...');
    
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_trips_billing 
      ON trips (facility_id, billable, pickup_date, status) 
      WHERE billable = TRUE;
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL });
    if (indexError) {
      console.error('❌ Index creation error:', indexError);
    } else {
      console.log('✅ Billing index created successfully');
    }

    // Step 5: Verify the fix
    console.log('\n4️⃣ Verifying the fix...');

    const { data: verificationData, error: verifyError } = await supabase
      .from('trips')
      .select('facility_id, status, billable, total_fare, price')
      .not('facility_id', 'is', null);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return;
    }

    const summary = {
      total_facility_trips: verificationData.length,
      completed_trips: verificationData.filter(t => t.status === 'completed').length,
      billable_trips: verificationData.filter(t => t.billable === true).length,
      trips_with_fare: verificationData.filter(t => t.total_fare > 0).length,
      total_billable_amount: verificationData
        .filter(t => t.billable === true)
        .reduce((sum, t) => sum + (parseFloat(t.total_fare) || 0), 0)
    };

    console.log('\n📊 Billing Fix Summary:');
    console.log('========================');
    console.log(`Total facility trips: ${summary.total_facility_trips}`);
    console.log(`Completed trips: ${summary.completed_trips}`);
    console.log(`Billable trips: ${summary.billable_trips}`);
    console.log(`Trips with fare: ${summary.trips_with_fare}`);
    console.log(`Total billable amount: $${summary.total_billable_amount.toFixed(2)}`);

    // Step 6: Check specific trip
    console.log('\n5️⃣ Checking your specific trip...');
    const { data: specificTrip, error: specificError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', '3651f947-abec-4e38-b0ed-a5cfd8cea539')
      .single();

    if (specificError) {
      console.log('❌ Could not find specific trip:', specificError);
    } else {
      console.log('🔍 Your trip details:');
      console.log(`- Status: ${specificTrip.status}`);
      console.log(`- Price: $${specificTrip.price || 0}`);
      console.log(`- Total Fare: $${specificTrip.total_fare || 0}`);
      console.log(`- Billable: ${specificTrip.billable}`);
      console.log(`- Facility ID: ${specificTrip.facility_id}`);
      console.log(`- Pickup Date: ${specificTrip.pickup_date}`);
    }

    console.log('\n🎉 Billing system fix completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Refresh the facility billing dashboard');
    console.log('2. Check if trips now show correct amounts');
    console.log('3. Verify monthly billing totals are accurate');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Execute the fix
fixBillingSystem().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});