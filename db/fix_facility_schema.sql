-- Add facility_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id);

-- Add facility_id column to trips table  
ALTER TABLE trips ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id);

-- Create facilities table if it doesn't exist
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

-- Enable RLS on facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Add policies for facilities
DROP POLICY IF EXISTS "Facility users can view their own facility" ON facilities;
CREATE POLICY "Facility users can view their own facility" 
ON facilities FOR SELECT 
USING (
  id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

DROP POLICY IF EXISTS "Facility users can update their own facility" ON facilities;
CREATE POLICY "Facility users can update their own facility" 
ON facilities FOR UPDATE 
USING (
  id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Add policies for facility admins to view their clients' profiles
DROP POLICY IF EXISTS "Facility admins can view their clients' profiles" ON profiles;
CREATE POLICY "Facility admins can view their clients' profiles" 
ON profiles FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

-- Add policies for facility admins to update their clients' profiles
DROP POLICY IF EXISTS "Facility admins can update their clients' profiles" ON profiles;
CREATE POLICY "Facility admins can update their clients' profiles" 
ON profiles FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

-- Add policies for facility admins to insert clients
DROP POLICY IF EXISTS "Facility admins can insert clients" ON profiles;
CREATE POLICY "Facility admins can insert clients" 
ON profiles FOR INSERT 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

-- Add trigger for facilities updated_at
DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;
CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON facilities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
