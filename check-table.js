import { createClient } from '@supabase/supabase-js';

// Using the credentials from seed.js
const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTable() {
  try {
    console.log('🔄 Creating facility_managed_clients table...');
    
    // Try to create the table through a regular query
    const { data, error } = await supabase
      .from('facility_managed_clients')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code === '42P01') {
      console.log('❌ Table does not exist. This is expected.');
      console.log('📋 Please run this SQL in your Supabase Dashboard > SQL Editor:');
      console.log('');
      console.log(`-- Create facility_managed_clients table
CREATE TABLE IF NOT EXISTS facility_managed_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone_number TEXT,
  address TEXT,
  accessibility_needs TEXT,
  medical_requirements TEXT,
  emergency_contact TEXT,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE facility_managed_clients ENABLE ROW LEVEL SECURITY;

-- Basic policy for now (you can refine later)
CREATE POLICY "Enable all operations for authenticated users" 
ON facility_managed_clients FOR ALL 
USING (true);`);
      console.log('');
      console.log('🔗 Supabase Dashboard: https://btzfgasugkycbavcwvnx.supabase.co/project/default/sql');
    } else if (error) {
      console.error('❌ Unexpected error:', error);
    } else {
      console.log('✅ Table already exists!');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

createTable();
