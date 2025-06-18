-- Migration script to add facility support
-- This script adds the facility_id column and creates the facilities table

-- First, create the facilities table if it doesn't exist
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT,
  contact_email TEXT,
  billing_email TEXT,
  payment_method_id TEXT,
  stripe_customer_id TEXT,
  facility_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add facility_id column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'facility_id') THEN
        ALTER TABLE profiles ADD COLUMN facility_id UUID REFERENCES facilities(id);
    END IF;
END $$;

-- Add facility_id column to trips table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'facility_id') THEN
        ALTER TABLE trips ADD COLUMN facility_id UUID REFERENCES facilities(id);
    END IF;
END $$;

-- Create trigger for facilities updated_at if the function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;
        CREATE TRIGGER update_facilities_updated_at
        BEFORE UPDATE ON facilities
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS for facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Facility users can view their own facility" ON facilities;
DROP POLICY IF EXISTS "Facility users can update their own facility" ON facilities;
DROP POLICY IF EXISTS "Facility admins can view their clients' profiles" ON profiles;
DROP POLICY IF EXISTS "Facility admins can update their clients' profiles" ON profiles;
DROP POLICY IF EXISTS "Facility admins can insert clients" ON profiles;
DROP POLICY IF EXISTS "Facility admins can view their facility's trips" ON trips;
DROP POLICY IF EXISTS "Facility admins can update their facility's trips" ON trips;
DROP POLICY IF EXISTS "Facility admins can insert trips for their clients" ON trips;

-- Create new policies for facilities
CREATE POLICY "Facility users can view their own facility" 
ON facilities FOR SELECT 
USING (
  id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

CREATE POLICY "Facility users can update their own facility" 
ON facilities FOR UPDATE 
USING (
  id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Create new policies for profiles to support facility administrators
CREATE POLICY "Facility admins can view their clients' profiles" 
ON profiles FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Facility admins can update their clients' profiles" 
ON profiles FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Facility admins can insert clients" 
ON profiles FOR INSERT 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

-- Create new policies for trips to support facility admins
CREATE POLICY "Facility admins can view their facility's trips" 
ON trips FOR SELECT 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility') OR
  user_id IN (SELECT id FROM profiles WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility'))
);

CREATE POLICY "Facility admins can update their facility's trips" 
ON trips FOR UPDATE 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility') OR
  user_id IN (SELECT id FROM profiles WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility'))
);

CREATE POLICY "Facility admins can insert trips for their clients" 
ON trips FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM profiles WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')) OR
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);
