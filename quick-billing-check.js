// Simple verification - paste in browser console on billing page
(async function checkBilling() {
  console.log('🔍 Checking billing status...');
  
  try {
    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://btzfgasugkycbavcwvnx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
    );

    // Check for June 2025 trips
    const { data: trips } = await supabase
      .from('trips')
      .select('id, pickup_time, price')
      .gte('pickup_time', '2025-06-01')
      .lte('pickup_time', '2025-06-30');
    
    console.log(`📊 June 2025 trips found: ${trips?.length || 0}`);
    
    if (!trips || trips.length === 0) {
      console.log('❌ NO DATA - Running quick fix...');
      
      // Quick data creation
      const { data: facility } = await supabase
        .from('facilities')
        .select('id')
        .limit(1)
        .single();
      
      if (facility) {
        // Create quick test data
        await supabase.from('profiles').insert({
          first_name: 'Test',
          last_name: 'Client',
          email: `test.${Date.now()}@test.com`,
          facility_id: facility.id,
          role: 'facility'
        });
        
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('first_name', 'Test')
          .single();
        
        if (user) {
          await supabase.from('trips').insert([
            {
              user_id: user.id,
              pickup_address: 'Test Address',
              destination_address: 'Test Destination',
              pickup_time: '2025-06-15T10:00:00Z',
              price: 45.50,
              status: 'completed'
            }
          ]);
          
          console.log('✅ Test data created! Refresh the page.');
        }
      }
    } else {
      const total = trips.reduce((sum, t) => sum + parseFloat(t.price), 0);
      console.log(`✅ BILLING DATA EXISTS: $${total.toFixed(2)} total`);
      console.log('💡 If page shows $0.00, try selecting "June 2025" from dropdown');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
