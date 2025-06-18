import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testTable() {
  console.log('🧪 Testing facility_managed_clients table...');
  
  try {
    // Test table exists and can select
    const { data: selectTest, error: selectError } = await supabase
      .from('facility_managed_clients')
      .select('count', { count: 'exact', head: true });
    
    if (selectError) {
      console.error('❌ Table select test failed:', selectError);
      return false;
    }
    
    console.log('✅ Table exists and is queryable');
    
    // Test insert
    const { data: insertData, error: insertError } = await supabase
      .from('facility_managed_clients')
      .insert({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        facility_id: 'test-facility'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      return false;
    }
    
    console.log('✅ Insert works! Created:', insertData);
    
    // Test select
    const { data: clients, error: selectAllError } = await supabase
      .from('facility_managed_clients')
      .select('*');
    
    if (selectAllError) {
      console.error('❌ Select all failed:', selectAllError);
      return false;
    }
    
    console.log('✅ Select works! Found', clients.length, 'clients');
    
    // Clean up test record
    await supabase
      .from('facility_managed_clients')
      .delete()
      .eq('id', insertData.id);
    
    console.log('✅ Database table is fully functional!');
    return true;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return false;
  }
}

testTable().then(success => {
  if (success) {
    console.log('🎉 SUCCESS: Database is ready for production!');
  } else {
    console.log('❌ FAILED: There are issues with the database table');
  }
  process.exit(success ? 0 : 1);
});
