-- Temporary fix for client creation without auth users
-- This allows facility-managed clients to be created for testing purposes

-- Create a temporary table for facility-managed clients who don't need authentication
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

-- Add RLS for the facility managed clients table
ALTER TABLE facility_managed_clients ENABLE ROW LEVEL SECURITY;

-- Policy to allow facility admins to view their clients
CREATE POLICY "Facility admins can view their managed clients" 
ON facility_managed_clients FOR SELECT 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Policy to allow facility admins to insert clients
CREATE POLICY "Facility admins can insert managed clients" 
ON facility_managed_clients FOR INSERT 
WITH CHECK (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Policy to allow facility admins to update their clients
CREATE POLICY "Facility admins can update their managed clients" 
ON facility_managed_clients FOR UPDATE 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Policy to allow facility admins to delete their clients
CREATE POLICY "Facility admins can delete their managed clients" 
ON facility_managed_clients FOR DELETE 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);
