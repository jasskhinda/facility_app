// Test the trips-billing API logic
const { createClient } = require('@supabase/supabase-js');

// Check if environment is loaded
console.log('🔍 Environment check:');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
console.log('SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

// Load environment
require('dotenv').config({ path: '.env.local' });

console.log('After loading .env.local:');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
console.log('SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✅ Supabase client created');

// Simple test
supabase.from('profiles').select('count').limit(1).then(result => {
  console.log('Database connection test:', result.error ? 'Failed' : 'Success');
  console.log('Count result:', result.data);
}).catch(err => {
  console.log('Connection error:', err.message);
});
