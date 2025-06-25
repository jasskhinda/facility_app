#!/usr/bin/env node

/**
 * Check Current Trip Statuses
 * See what trips exist and their current statuses
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTripStatuses() {
  console.log('🔍 Checking Current Trip Statuses');
  console.log('=================================');

  try {
    // Check the specific trip mentioned (fe5f6b7c)
    console.log('\n1️⃣ Checking specific trip: fe5f6b7c...');
    
    const { data: specificTrip, error: specificError } = await supabase
      .from('trips')
      .select('*')
      .like('id', 'fe5f6b7c%')
      .single();

    if (specificError && specificError.code !== 'PGRST116') {
      console.error('Error fetching specific trip:', specificError);
    } else if (specificTrip) {
      console.log('✅ Found trip fe5f6b7c:');
      console.log('   Full ID:', specificTrip.id);
      console.log('   Status:', specificTrip.status);
      console.log('   Cancellation reason:', specificTrip.cancellation_reason);
      console.log('   Updated at:', specificTrip.updated_at);
      console.log('   Created at:', specificTrip.created_at);
    } else {
      console.log('❌ Trip fe5f6b7c not found');
    }

    // Check all pending trips
    console.log('\n2️⃣ Checking all pending trips...');
    
    const { data: pendingTrips, error: pendingError } = await supabase
      .from('trips')
      .select('id, status, cancellation_reason, updated_at, user_id, managed_client_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (pendingError) {
      console.error('Error fetching pending trips:', pendingError);
    } else {
      console.log(`Found ${pendingTrips.length} pending trips:`);
      pendingTrips.forEach((trip, index) => {
        console.log(`   ${index + 1}. ${trip.id.substring(0, 8)} - Status: ${trip.status}`);
      });
    }

    // Check all cancelled trips
    console.log('\n3️⃣ Checking all cancelled trips...');
    
    const { data: cancelledTrips, error: cancelledError } = await supabase
      .from('trips')
      .select('id, status, cancellation_reason, updated_at')
      .eq('status', 'cancelled')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (cancelledError) {
      console.error('Error fetching cancelled trips:', cancelledError);
    } else {
      console.log(`Found ${cancelledTrips.length} cancelled trips:`);
      cancelledTrips.forEach((trip, index) => {
        console.log(`   ${index + 1}. ${trip.id.substring(0, 8)} - Status: ${trip.status}`);
        console.log(`      Reason: ${trip.cancellation_reason || 'No reason'}`);
        console.log(`      Updated: ${trip.updated_at}`);
      });
    }

    // Check what the dispatcher query actually returns
    console.log('\n4️⃣ Testing dispatcher app query...');
    
    const { data: dispatcherTrips, error: dispatcherError } = await supabase
      .from('trips')
      .select('*')
      .eq('trip_type', 'facility_booking')
      .order('created_at', { ascending: false })
      .limit(10);

    if (dispatcherError) {
      console.error('Error with dispatcher query:', dispatcherError);
    } else {
      console.log(`Dispatcher query returned ${dispatcherTrips.length} trips:`);
      dispatcherTrips.forEach((trip, index) => {
        console.log(`   ${index + 1}. ${trip.id.substring(0, 8)} - Status: ${trip.status} - Type: ${trip.trip_type}`);
        if (trip.id.startsWith('fe5f6b7c')) {
          console.log('   ⭐ This is the trip you tried to reject!');
          console.log(`      Current status in DB: ${trip.status}`);
          console.log(`      Cancellation reason: ${trip.cancellation_reason || 'None'}`);
        }
      });
    }

    // Test a manual rejection to see if it works
    const testTripId = dispatcherTrips.find(trip => trip.status === 'pending')?.id;
    if (testTripId) {
      console.log('\n5️⃣ Testing manual rejection...');
      console.log('Test trip ID:', testTripId.substring(0, 8));
      
      const { data: rejectionTest, error: rejectionError } = await supabase
        .from('trips')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Manual test rejection from debug script',
          updated_at: new Date().toISOString()
        })
        .eq('id', testTripId)
        .select();

      if (rejectionError) {
        console.error('❌ Manual rejection failed:', rejectionError);
      } else {
        console.log('✅ Manual rejection successful:', rejectionTest);
        
        // Verify it persisted
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: verifyRejection } = await supabase
          .from('trips')
          .select('status, cancellation_reason')
          .eq('id', testTripId)
          .single();
        
        console.log('✅ Verification - Status:', verifyRejection.status);
        console.log('✅ Verification - Reason:', verifyRejection.cancellation_reason);
      }
    }

  } catch (error) {
    console.error('❌ Debug check failed:', error);
  }
}

if (require.main === module) {
  checkTripStatuses();
}
