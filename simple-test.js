console.log('🔧 Starting test...');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.KN_6rL7Rn8sHk3UF_0qT8J8oa0-tJbPfH5k9OvC_GNY';

console.log('Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function simpleTest() {
  try {
    console.log('Testing connection...');
    const { data, error } = await supabase.from('facilities').select('id, name').limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Connection successful!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.log('💥 Exception:', err.message);
  }
}

console.log('Calling test function...');
simpleTest().then(() => {
  console.log('Test completed!');
}).catch(err => {
  console.log('Error in test:', err.message);
});
