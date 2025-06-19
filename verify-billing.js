const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Quick billing check...');

supabase
  .from('profiles')
  .select('id')
  .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3')
  .then(({ data }) => {
    console.log('Facility users:', data?.length);
    
    if (data?.length > 0) {
      return supabase
        .from('trips')
        .select('id, price')
        .in('user_id', data.map(u => u.id))
        .not('price', 'is', null);
    }
    return { data: [] };
  })
  .then(({ data }) => {
    console.log('Billable trips:', data?.length);
    if (data?.length > 0) {
      const total = data.reduce((sum, t) => sum + parseFloat(t.price), 0);
      console.log('Total revenue: $' + total.toFixed(2));
      console.log('✅ Billing system ready!');
    }
  })
  .catch(console.error);
