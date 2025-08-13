import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function executeDeleteAllTrips() {
  try {
    console.log('🚨 EXECUTING: DELETE ALL TRIPS');
    console.log('═══════════════════════════════════');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get current trip count
    const { count: currentTrips } = await adminSupabase
      .from('trips')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 CURRENT TRIPS: ${currentTrips}`);

    if (currentTrips === 0) {
      console.log('✅ No trips to delete - database is already clean!');
      return;
    }

    console.log(`\n⚠️  ABOUT TO PERMANENTLY DELETE ${currentTrips} TRIPS`);
    console.log('   This includes trips from:');
    console.log('   • Facility app bookings');
    console.log('   • Booking app requests');
    console.log('   • All trip history and data');
    console.log('   • This action CANNOT be undone!');

    console.log('\n🚨 STARTING DELETION IN 3 SECONDS...');
    console.log('   Press Ctrl+C to cancel!');
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🗑️  DELETING ALL TRIPS...');
    
    const { error } = await adminSupabase
      .from('trips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all trips

    if (error) {
      console.error('❌ ERROR DELETING TRIPS:', error);
      return;
    }

    // Verify deletion
    const { count: remainingTrips } = await adminSupabase
      .from('trips')
      .select('*', { count: 'exact', head: true });

    console.log('\n🎉 DELETION COMPLETE!');
    console.log(`   ✅ Deleted: ${currentTrips} trips`);
    console.log(`   📊 Remaining: ${remainingTrips} trips`);

    if (remainingTrips === 0) {
      console.log('\n✅ SUCCESS: All trips have been deleted!');
      console.log('   • Facility app: Clean slate');
      console.log('   • Booking app: Clean slate');
      console.log('   • Database: Ready for fresh data');
    } else {
      console.log(`\n⚠️  WARNING: ${remainingTrips} trips still remain`);
    }

  } catch (error) {
    console.error('💥 UNEXPECTED ERROR:', error);
  }
}

executeDeleteAllTrips();