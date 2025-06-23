// Simple test version of dashboard fix
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('Testing dashboard fix...');
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing');
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Found' : 'Missing');

async function testFix() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log('Supabase client created successfully');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1);

    if (error) {
      console.log('Database error:', error.message);
    } else {
      console.log('Database connection successful');
      console.log('Sample facility:', data);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testFix();
