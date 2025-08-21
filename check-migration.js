const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key starts with:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    console.log('🔍 Checking existing columns...');
    
    // Test a simple query to see if we can connect
    const { data: testData, error: testError } = await supabase
      .from('trips')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Try to select the new columns to see if they exist
    const { data, error } = await supabase
      .from('trips')
      .select('id, pricing_breakdown_data, pricing_breakdown_total, pricing_breakdown_locked_at')
      .limit(1);
      
    if (error) {
      if (error.message.includes('pricing_breakdown_data') || error.message.includes('column') || error.message.includes('does not exist')) {
        console.log('ℹ️ Pricing breakdown columns do not exist yet');
        console.log('📝 You will need to add them manually through Supabase Dashboard:');
        console.log('   1. Go to Supabase Dashboard > Table Editor > trips table');
        console.log('   2. Add new columns:');
        console.log('      - pricing_breakdown_data (type: jsonb)');
        console.log('      - pricing_breakdown_total (type: numeric)');
        console.log('      - pricing_breakdown_locked_at (type: timestamptz)');
        console.log('');
        console.log('   Or run this SQL in Supabase SQL Editor:');
        console.log('   ALTER TABLE trips ADD COLUMN pricing_breakdown_data JSONB;');
        console.log('   ALTER TABLE trips ADD COLUMN pricing_breakdown_total DECIMAL(10,2);');
        console.log('   ALTER TABLE trips ADD COLUMN pricing_breakdown_locked_at TIMESTAMPTZ;');
      } else {
        console.error('❌ Error checking columns:', error);
      }
    } else {
      console.log('✅ Pricing breakdown columns already exist!');
      console.log('Data:', data);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkColumns();
