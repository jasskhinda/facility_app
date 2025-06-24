/**
 * Database Debug Script - Check Managed Client Data
 * This will help identify why client "ea79223a" is not being resolved
 */

import { createClient } from '@supabase/supabase-js';

async function debugManagedClientData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('🔍 Debugging Managed Client Data...\n');
  
  try {
    // 1. Check if the managed client ID exists in trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, pickup_address')
      .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3')
      .not('managed_client_id', 'is', null)
      .limit(10);
    
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }
    
    console.log(`✅ Found ${trips.length} trips with managed_client_id`);
    
    // Look for the specific problematic ID
    const problematicTrip = trips.find(trip => trip.managed_client_id.includes('ea79223a'));
    if (problematicTrip) {
      console.log('🎯 Found problematic trip:');
      console.log('   Trip ID:', problematicTrip.id);
      console.log('   Managed Client ID:', problematicTrip.managed_client_id);
      console.log('   Pickup:', problematicTrip.pickup_address);
    }
    
    // Get all unique managed client IDs
    const managedClientIds = [...new Set(trips.map(trip => trip.managed_client_id))];
    console.log(`\n📊 Unique managed client IDs: ${managedClientIds.length}`);
    console.log('Sample IDs:', managedClientIds.slice(0, 5));
    
    // 2. Check what's in the facility_managed_clients table
    console.log('\n🔍 Checking facility_managed_clients table...');
    
    const { data: managedClients, error: managedError } = await supabase
      .from('facility_managed_clients')
      .select('*')
      .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3')
      .limit(10);
    
    if (managedError) {
      console.error('❌ Error fetching managed clients:', managedError);
      
      // Try the old table name as fallback
      console.log('\n🔍 Trying old table name "managed_clients"...');
      const { data: oldManagedClients, error: oldError } = await supabase
        .from('managed_clients')
        .select('*')
        .limit(10);
        
      if (oldError) {
        console.error('❌ Old table also has error:', oldError);
      } else {
        console.log(`✅ Found ${oldManagedClients.length} records in old managed_clients table`);
        if (oldManagedClients.length > 0) {
          console.log('Sample record:', oldManagedClients[0]);
        }
      }
    } else {
      console.log(`✅ Found ${managedClients.length} records in facility_managed_clients table`);
      if (managedClients.length > 0) {
        console.log('Sample record:', managedClients[0]);
        
        // Check if our problematic ID exists
        const foundClient = managedClients.find(client => 
          client.id && client.id.includes('ea79223a')
        );
        
        if (foundClient) {
          console.log('✅ Found the problematic client record:', foundClient);
        } else {
          console.log('❌ Problematic client ID not found in facility_managed_clients');
          console.log('Available IDs:', managedClients.map(c => c.id).slice(0, 5));
        }
      }
    }
    
    // 3. Check for ID mismatches
    console.log('\n🔍 Checking for ID mismatches...');
    const tripIds = managedClientIds;
    const tableIds = managedClients?.map(c => c.id) || [];
    
    const missingInTable = tripIds.filter(id => !tableIds.includes(id));
    console.log(`❌ IDs in trips but missing in table: ${missingInTable.length}`);
    if (missingInTable.length > 0) {
      console.log('Missing IDs:', missingInTable.slice(0, 5));
    }
    
    const extraInTable = tableIds.filter(id => !tripIds.includes(id));
    console.log(`⚠️  IDs in table but not in trips: ${extraInTable.length}`);
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Export for use
export default debugManagedClientData;
