#!/usr/bin/env node

/**
 * Real-Time Debug Test
 * Test if Supabase real-time subscriptions are working
 */

const { createClient } = require('@supabase/supabase-js');

// Same Supabase configuration as used in the apps
const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtimeConnection() {
  console.log('🔍 Testing Real-Time Connection');
  console.log('===============================');

  // Test 1: Check if we can connect to Supabase
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('id, status, facility_id')
      .limit(1);

    if (error) {
      console.error('❌ Cannot connect to Supabase:', error);
      return;
    }

    console.log('✅ Supabase connection successful');
    console.log('Sample trip data:', data[0]);

  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return;
  }

  // Test 2: Set up real-time listener
  console.log('\\n📡 Setting up real-time listener...');
  
  const subscription = supabase
    .channel('debug-test-channel')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trips'
      },
      (payload) => {
        console.log('\\n🔄 REAL-TIME UPDATE RECEIVED!');
        console.log('================================');
        console.log('Event:', payload.eventType);
        console.log('Table:', payload.table);
        console.log('Old data:', JSON.stringify(payload.old, null, 2));
        console.log('New data:', JSON.stringify(payload.new, null, 2));
        console.log('Timestamp:', new Date().toISOString());
        
        if (payload.old && payload.new) {
          if (payload.old.status !== payload.new.status) {
            console.log('🎯 STATUS CHANGE DETECTED!');
            console.log(`   ${payload.old.status} → ${payload.new.status}`);
          }
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to real-time updates');
        console.log('\\n⏳ Waiting for trip status changes...');
        console.log('   (Try approving/rejecting a trip in the dispatcher app)');
        
        // Set a timeout to test with a manual update
        setTimeout(async () => {
          console.log('\\n🧪 Creating test update to trigger real-time...');
          
          // Find a test trip to update
          const { data: testTrips } = await supabase
            .from('trips')
            .select('id, status')
            .limit(1);
          
          if (testTrips && testTrips.length > 0) {
            const testTrip = testTrips[0];
            console.log('Updating test trip:', testTrip.id);
            
            // Make a simple update to trigger real-time
            await supabase
              .from('trips')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', testTrip.id);
              
            console.log('✅ Test update sent');
          }
        }, 5000);
      }
    });

  // Keep the script running
  console.log('\\n🔄 Real-time listener is active. Press Ctrl+C to exit.');
  
  // Clean up after 30 seconds
  setTimeout(() => {
    console.log('\\n🧹 Cleaning up and exiting...');
    subscription.unsubscribe();
    process.exit(0);
  }, 30000);
}

if (require.main === module) {
  testRealtimeConnection();
}
