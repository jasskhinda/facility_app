#!/bin/bash

echo "🔧 Setting up facility_managed_clients table for testing..."

echo "
📋 Please run this SQL in your Supabase Dashboard > SQL Editor:
   https://btzfgasugkycbavcwvnx.supabase.co/project/default/sql

-- Create facility_managed_clients table
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
  facility_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS (basic policy for testing)
ALTER TABLE facility_managed_clients ENABLE ROW LEVEL SECURITY;

-- Permissive policy for testing
CREATE POLICY \"Enable all operations for testing\" 
ON facility_managed_clients FOR ALL 
USING (true);

-- Test the API after running the SQL above
echo \"
🧪 After running the SQL, test the API with:

curl -X POST http://localhost:3004/api/facility/clients \\
  -H 'Content-Type: application/json' \\
  -H 'x-development-bypass: true' \\
  -d '{
    \"first_name\": \"Test\",
    \"last_name\": \"Client\",
    \"email\": \"test@example.com\",
    \"phone_number\": \"555-1234\"
  }'
\"

echo \"✅ If successful, you should see: {\\\"message\\\": \\\"Client created successfully\\\"}\"
