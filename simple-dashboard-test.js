// Simple Dashboard Test and Fix
console.log('Starting simple dashboard fix...');

// Test basic Node.js functionality
console.log('✅ Node.js working');
console.log('✅ Current date:', new Date().toISOString());

// Test environment variables
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');

// Try to load dotenv
try {
  require('dotenv').config({ path: '.env.local' });
  console.log('✅ dotenv loaded');
} catch (err) {
  console.log('⚠️ dotenv error:', err.message);
}

// Test environment variables
console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing');
console.log('- SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Found' : 'Missing');

// Try to load Supabase
try {
  const { createClient } = require('@supabase/supabase-js');
  console.log('✅ Supabase client module loaded');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing'
  );
  console.log('✅ Supabase client created');
  
  // Test basic query
  async function testQuery() {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name')
        .limit(1);
      
      if (error) {
        console.log('❌ Database query error:', error.message);
      } else {
        console.log('✅ Database connection successful');
        console.log('✅ Sample data:', data);
        
        if (data && data.length > 0) {
          console.log('\n🔧 Running basic fixes...\n');
          
          // Fix 1: Update facility clients to active
          const { data: activeUpdate, error: activeError } = await supabase
            .from('profiles')
            .update({ status: 'active' })
            .eq('facility_id', data[0].id)
            .eq('role', 'facility')
            .select();
          
          if (activeError) {
            console.log('⚠️ Active update error:', activeError.message);
          } else {
            console.log(`✅ Updated ${activeUpdate?.length || 0} clients to active`);
          }
          
          // Fix 2: Check current trip count
          const { count: tripCount, error: tripCountError } = await supabase
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .gte('pickup_time', '2025-06-01T00:00:00Z')
            .lt('pickup_time', '2025-07-01T00:00:00Z');
          
          if (!tripCountError) {
            console.log(`✅ Current June trips: ${tripCount || 0}`);
          }
          
          console.log('\n🎉 Basic fixes completed!');
        }
      }
    } catch (err) {
      console.log('❌ Async error:', err.message);
    }
  }
  
  testQuery();
  
} catch (err) {
  console.log('❌ Supabase error:', err.message);
}

console.log('\n📝 Script completed.');
