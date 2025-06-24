-- Add test managed client data to resolve "Managed Client (ea79223a)" issue
-- Run this in the Supabase SQL Editor

-- First, create the managed_clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS managed_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  name TEXT,
  client_name TEXT,
  email TEXT,
  phone TEXT,
  facility_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add test managed client data that matches the ID pattern we're seeing
INSERT INTO managed_clients (id, first_name, last_name, name, client_name, email, phone, facility_id) VALUES
(
  'ea79223a-1234-5678-9abc-def012345678',
  'John',
  'Smith',
  'John Smith',
  'John Smith',
  'john.smith@example.com',
  '(555) 123-4567',
  'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
),
(
  'ea79223a-2345-6789-bcde-f01234567890',
  'Mary',
  'Johnson',
  'Mary Johnson',
  'Mary Johnson',
  'mary.johnson@example.com',
  '(555) 987-6543',
  'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
),
(
  'ea79223a-3456-789a-cdef-012345678901',
  'Robert',
  'Wilson',
  'Robert Wilson',
  'Robert Wilson',
  'robert.wilson@example.com',
  '(555) 456-7890',
  'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'
)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  name = EXCLUDED.name,
  client_name = EXCLUDED.client_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  updated_at = NOW();

-- Verify the data was inserted
SELECT 
  id,
  first_name,
  last_name,
  name,
  client_name,
  LEFT(id::text, 8) as id_prefix
FROM managed_clients 
WHERE LEFT(id::text, 8) = 'ea79223a'
ORDER BY created_at;
