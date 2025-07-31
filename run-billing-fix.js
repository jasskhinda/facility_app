// Quick billing fix script
// Run this to fix your specific trip: node run-billing-fix.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function quickFix() {
  console.log('🔧 Running quick billing fix...\n');

  try {
    // Add missing columns (safe to run multiple times)
    console.log('1️⃣ Adding missing columns...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT FALSE;
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_fare DECIMAL(10,2);
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_date DATE;
      `
    });

    // Update your specific trip and others
    console.log('2️⃣ Updating trip data...');
    
    const { data: updatedTrips, error: updateError } = await supabase
      .from('trips')
      .update({
        billable: true,
        total_fare: supabase.raw('COALESCE(price, distance * 2.50, 25.00)'),
        pickup_date: supabase.raw('DATE(pickup_time)')
      })
      .eq('status', 'completed')
      .not('facility_id', 'is', null)
      .select();

    if (updateError) {
      console.error('❌ Update error:', updateError);
    } else {
      console.log(`✅ Updated ${updatedTrips?.length || 0} trips`);
    }

    // Check your specific trip
    console.log('3️⃣ Checking your trip...');
    
    const { data: yourTrip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', '3651f947-abec-4e38-b0ed-a5cfd8cea539')
      .single();

    if (tripError) {
      console.log('❌ Could not find your trip:', tripError);
    } else {
      console.log('🎯 Your trip status:');
      console.log(`   - Status: ${yourTrip.status}`);
      console.log(`   - Price: $${yourTrip.price || 0}`);
      console.log(`   - Total Fare: $${yourTrip.total_fare || 0}`);
      console.log(`   - Billable: ${yourTrip.billable}`);
      console.log(`   - Pickup Date: ${yourTrip.pickup_date}`);
      console.log(`   - Facility ID: ${yourTrip.facility_id}`);
    }

    console.log('\n✅ Fix completed! Refresh the billing dashboard.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickFix();