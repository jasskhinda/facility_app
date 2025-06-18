const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function quickTest() {
  console.log('🧪 Quick database test...');
  
  try {
    // Test insert
    const { data, error } = await supabase
      .from('facility_managed_clients')
      .insert({
        first_name: 'Test',
        last_name: 'Client',
        email: 'test@example.com',
        facility_id: 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ SUCCESS! Client created:', data);
    
    // Clean up
    await supabase
      .from('facility_managed_clients')
      .delete()
      .eq('id', data.id);
    
    console.log('✅ Database is working perfectly!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

quickTest();
