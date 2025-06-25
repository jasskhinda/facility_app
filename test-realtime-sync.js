#!/usr/bin/env node

/**
 * Real-Time Synchronization Test Script
 * Tests the integration between Facility App, Dispatcher App, and Billing System
 */

const { createClient } = require('@supabase/supabase-js');

// Same Supabase configuration as used in the apps
const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealTimeSync() {
  console.log('🚀 Starting Real-Time Synchronization Test');
  console.log('=====================================');

  try {
    // 1. Create a test trip from facility
    console.log('\n1️⃣ Creating test trip from facility...');
    const testTrip = {
      user_id: 'ea79223a-b30b-4b70-b86e-cdab8ae88bdf', // David Patel
      facility_id: '9e7b8c9b-4e7b-4c9b-8e7b-9c9b4e7b8c9b', // Test facility
      pickup_location: '123 Main St, Toronto, ON',
      dropoff_location: '456 Oak Ave, Toronto, ON',
      pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      status: 'pending',
      trip_type: 'facility_booking',
      price: 45.00,
      notes: 'Real-time sync test trip'
    };

    const { data: createdTrip, error: createError } = await supabase
      .from('trips')
      .insert([testTrip])
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create test trip:', createError);
      return;
    }

    console.log('✅ Test trip created:', createdTrip.id);

    // 2. Set up real-time listener (simulating facility app)
    console.log('\n2️⃣ Setting up real-time listener (simulating facility app)...');
    
    const subscription = supabase
      .channel('test-sync-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${createdTrip.id}`
        },
        (payload) => {
          console.log('\n🔄 Real-time update received:');
          console.log('   Trip ID:', payload.new.id);
          console.log('   Status Change:', payload.old.status, '→', payload.new.status);
          console.log('   Updated at:', new Date().toISOString());
          
          if (payload.new.status === 'upcoming') {
            console.log('✅ Trip approved by dispatcher!');
          } else if (payload.new.status === 'cancelled') {
            console.log('❌ Trip rejected by dispatcher!');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // 3. Wait a moment, then simulate dispatcher approval
    console.log('\n3️⃣ Waiting 3 seconds, then simulating dispatcher approval...');
    
    setTimeout(async () => {
      console.log('\n🎯 Simulating dispatcher approval...');
      
      const { data: approvedTrip, error: approveError } = await supabase
        .from('trips')
        .update({ 
          status: 'upcoming',
          updated_at: new Date().toISOString()
        })
        .eq('id', createdTrip.id)
        .select()
        .single();

      if (approveError) {
        console.error('❌ Failed to approve trip:', approveError);
        return;
      }

      console.log('✅ Trip approved successfully');

      // 4. Wait another moment, then simulate completion
      setTimeout(async () => {
        console.log('\n🏁 Simulating trip completion...');
        
        const { data: completedTrip, error: completeError } = await supabase
          .from('trips')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', createdTrip.id)
          .select()
          .single();

        if (completeError) {
          console.error('❌ Failed to complete trip:', completeError);
          return;
        }

        console.log('✅ Trip completed successfully');

        // 5. Clean up
        setTimeout(async () => {
          console.log('\n🧹 Cleaning up test data...');
          
          await supabase
            .from('trips')
            .delete()
            .eq('id', createdTrip.id);

          subscription.unsubscribe();
          console.log('✅ Test completed and cleaned up');
          
          console.log('\n🎉 Real-Time Synchronization Test Complete!');
          console.log('=====================================');
          process.exit(0);
        }, 2000);

      }, 3000);

    }, 3000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testRealTimeSync();
}

module.exports = { testRealTimeSync };
