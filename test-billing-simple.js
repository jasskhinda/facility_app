const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSimple() {
  console.log('🧪 Simple Billing Test');
  
  try {
    // Check facility users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, facility_id, role')
      .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3');
    
    console.log(`✅ Found ${users?.length || 0} users in facility`);
    
    if (users?.length > 0) {
      // Check trips
      const userIds = users.map(u => u.id);
      const { data: trips } = await supabase
        .from('trips')
        .select('id, price, status, user_id')
        .in('user_id', userIds)
        .not('price', 'is', null);
      
      console.log(`🎯 Found ${trips?.length || 0} trips with pricing`);
      
      if (trips?.length > 0) {
        const total = trips.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);
        console.log(`💰 Total revenue: $${total.toFixed(2)}`);
        console.log(`📊 Trip statuses:`, [...new Set(trips.map(t => t.status))]);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimple();
