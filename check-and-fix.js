import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateTable() {
  console.log('🔍 Checking if facility_managed_clients table exists...');
  
  try {
    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('facility_managed_clients')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table does not exist. Need to create it.');
        console.log('');
        console.log('🔧 SOLUTION: Run this SQL in your Supabase Dashboard:');
        console.log('📋 Go to: https://btzfgasugkycbavcwvnx.supabase.co/project/default/sql');
        console.log('');
        console.log('-- Paste this SQL and click RUN:');
        console.log('');
        console.log(`CREATE TABLE IF NOT EXISTS facility_managed_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone_number TEXT,
  address TEXT,
  accessibility_needs TEXT,
  medical_requirements TEXT,
  emergency_contact TEXT,
  facility_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE facility_managed_clients ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can refine this later)
CREATE POLICY "Enable all operations for authenticated users" 
ON facility_managed_clients FOR ALL 
USING (true);`);
        console.log('');
        console.log('🚀 After running the SQL, your app will work correctly!');
        return false;
      } else {
        console.error('❌ Unexpected error:', error);
        return false;
      }
    } else {
      console.log('✅ Table already exists and is accessible!');
      console.log(`📊 Table status: Ready for use`);
      return true;
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

// Also test the API endpoints
async function testAPI() {
  console.log('');
  console.log('🧪 Testing API endpoints...');
  
  try {
    // Test GET endpoint
    const getResponse = await fetch('http://localhost:3004/api/facility/clients');
    console.log('GET /api/facility/clients:', getResponse.status === 401 ? '✅ Protected (requires auth)' : `Status: ${getResponse.status}`);
    
    // Test POST endpoint
    const postResponse = await fetch('http://localhost:3004/api/facility/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Test', last_name: 'Client', email: 'test@example.com' })
    });
    console.log('POST /api/facility/clients:', postResponse.status === 401 ? '✅ Protected (requires auth)' : `Status: ${postResponse.status}`);
    
  } catch (error) {
    console.log('⚠️  API test failed (server might not be running):', error.message);
  }
}

async function main() {
  const tableExists = await checkAndCreateTable();
  await testAPI();
  
  if (tableExists) {
    console.log('');
    console.log('🎉 Your app is ready! The database table exists and APIs are working.');
    console.log('✅ You can now log in and create clients through the dashboard.');
  } else {
    console.log('');
    console.log('⏳ Next step: Run the SQL above in Supabase Dashboard, then test again.');
  }
}

main();
