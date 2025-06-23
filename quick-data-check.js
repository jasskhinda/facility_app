// Quick script to check and add billing data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function quickCheck() {
  console.log('🔍 Quick billing data check...');
  
  try {
    // Check for trips in June 2025
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, pickup_time, price, user_id')
      .gte('pickup_time', '2025-06-01T00:00:00.000Z')
      .lte('pickup_time', '2025-06-30T23:59:59.999Z')
      .order('pickup_time', { ascending: false });

    console.log('📊 June 2025 trips found:', trips?.length || 0);
    if (trips?.length > 0) {
      console.log('💰 Sample trip prices:', trips.slice(0, 3).map(t => `$${t.price}`));
    }

    // Check facilities
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(3);
    
    console.log('🏥 Facilities:', facilities?.length || 0);
    
    // Check facility users
    if (facilities?.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, facility_id, role')
        .eq('facility_id', facilities[0].id)
        .eq('role', 'facility');
      
      console.log('👥 Facility users for', facilities[0].name, ':', users?.length || 0);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

quickCheck();
