import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function analyzeFacilities() {
  try {
    console.log('🔍 Analyzing all facilities and their data...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all facilities with their data
    const { data: facilities, error: facilitiesError } = await adminSupabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: true });

    if (facilitiesError) {
      console.error('❌ Error fetching facilities:', facilitiesError);
      return;
    }

    console.log(`\n📊 Found ${facilities.length} facilities:\n`);

    for (const facility of facilities) {
      console.log(`🏥 ${facility.name}`);
      console.log(`   ID: ${facility.id}`);
      console.log(`   Email: ${facility.email || 'N/A'}`);
      console.log(`   Phone: ${facility.phone || 'N/A'}`);
      console.log(`   Address: ${facility.address || 'N/A'}`);
      console.log(`   Created: ${new Date(facility.created_at).toLocaleDateString()}`);

      // Count users
      const { data: users } = await adminSupabase
        .from('facility_users')
        .select('role, is_owner')
        .eq('facility_id', facility.id);

      const userCount = users?.length || 0;
      const ownerCount = users?.filter(u => u.is_owner).length || 0;
      const adminCount = users?.filter(u => u.role === 'super_admin' || u.role === 'admin').length || 0;

      console.log(`   👥 Users: ${userCount} (${ownerCount} owners, ${adminCount} admins)`);

      // Count trips
      const { data: trips } = await adminSupabase
        .from('trips')
        .select('id, status, created_at')
        .eq('facility_id', facility.id);

      const tripCount = trips?.length || 0;
      const recentTrips = trips?.filter(t => new Date(t.created_at) > new Date('2025-01-01')).length || 0;

      console.log(`   🚗 Trips: ${tripCount} total (${recentTrips} in 2025)`);

      // Count profiles associated with this facility
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, role')
        .eq('facility_id', facility.id);

      const profileCount = profiles?.length || 0;
      const clientCount = profiles?.filter(p => p.role === 'client').length || 0;

      console.log(`   👤 Profiles: ${profileCount} (${clientCount} clients)`);

      // Check for managed clients
      const { data: managedClients } = await adminSupabase
        .from('facility_managed_clients')
        .select('id')
        .eq('facility_id', facility.id);

      const managedClientCount = managedClients?.length || 0;
      console.log(`   📋 Managed Clients: ${managedClientCount}`);

      console.log('   ─────────────────────────────────────────');
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    const totalUsers = await adminSupabase.from('facility_users').select('id', { count: 'exact' });
    const totalTrips = await adminSupabase.from('trips').select('id', { count: 'exact' });
    const totalProfiles = await adminSupabase.from('profiles').select('id', { count: 'exact' });

    console.log(`   🏥 Total Facilities: ${facilities.length}`);
    console.log(`   👥 Total Facility Users: ${totalUsers.count || 0}`);
    console.log(`   🚗 Total Trips: ${totalTrips.count || 0}`);
    console.log(`   👤 Total Profiles: ${totalProfiles.count || 0}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   Keep facilities with:');
    console.log('   ✅ Recent activity (trips in 2025)');
    console.log('   ✅ Multiple real users');
    console.log('   ✅ Production-like names (not test names)');
    console.log('   ✅ Real email addresses');
    
    console.log('\n   Consider removing facilities with:');
    console.log('   ❌ No recent trips');
    console.log('   ❌ Only test users');
    console.log('   ❌ Test-like names');
    console.log('   ❌ No real contact information');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

analyzeFacilities();