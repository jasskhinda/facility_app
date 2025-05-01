-- facility_schema.sql
-- Schema modifications for facility app

-- Create facilities table
CREATE TABLE facilities (
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

-- Create trigger for updated_at
CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON facilities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add facility_id to profiles table
ALTER TABLE profiles ADD COLUMN facility_id UUID REFERENCES facilities(id);

-- Add facility_id to trips table
ALTER TABLE trips ADD COLUMN facility_id UUID REFERENCES facilities(id);

-- Row Level Security for facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Policy to allow facility admins to see only their own facility
CREATE POLICY "Facility users can view their own facility" 
ON facilities FOR SELECT 
USING (
  id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Policy to allow facility admins to update their own facility
CREATE POLICY "Facility users can update their own facility" 
ON facilities FOR UPDATE 
USING (
  id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Modify existing policies for profiles to support facility administrators

-- Policy to allow facility admins to view all profiles associated with their facility
CREATE POLICY "Facility admins can view their clients' profiles" 
ON profiles FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

-- Policy to allow facility admins to update profiles of clients in their facility
CREATE POLICY "Facility admins can update their clients' profiles" 
ON profiles FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

-- Policy to allow facility admins to insert clients for their facility
CREATE POLICY "Facility admins can insert clients" 
ON profiles FOR INSERT 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'facility' AND
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())
);

-- Modify trips table policies to support facility admins

-- Policy to allow facility admins to view all trips booked by their facility
CREATE POLICY "Facility admins can view their facility's trips" 
ON trips FOR SELECT 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility') OR
  user_id IN (SELECT id FROM profiles WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility'))
);

-- Policy to allow facility admins to update trips booked by their facility
CREATE POLICY "Facility admins can update their facility's trips" 
ON trips FOR UPDATE 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility') OR
  user_id IN (SELECT id FROM profiles WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility'))
);

-- Policy to allow facility admins to insert trips for their facility clients
CREATE POLICY "Facility admins can insert trips for their clients" 
ON trips FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM profiles WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')) OR
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

-- Function to create and associate a client with a facility
CREATE OR REPLACE FUNCTION create_facility_client(
  client_email TEXT,
  client_first_name TEXT,
  client_last_name TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_accessibility_needs TEXT,
  client_medical_requirements TEXT,
  facility_id UUID
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user in auth schema (would need to be handled in application code)
  -- For this SQL function we'll just create the profile assuming the auth user exists
  new_user_id := uuid_generate_v4(); -- This is a placeholder; in reality, this would come from auth.users
  
  INSERT INTO profiles (
    id, 
    first_name, 
    last_name, 
    phone_number, 
    address, 
    accessibility_needs, 
    medical_requirements,
    facility_id,
    role
  ) VALUES (
    new_user_id,
    client_first_name,
    client_last_name,
    client_phone,
    client_address,
    client_accessibility_needs,
    client_medical_requirements,
    facility_id,
    'client'
  );
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify handle_new_user function to handle facility role
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
  user_role TEXT;
  user_facility_id UUID;
BEGIN
  -- For OAuth logins, handle OAuth provider specific metadata formats
  IF NEW.raw_user_meta_data->>'provider' = 'google' THEN
    first_name_val := NEW.raw_user_meta_data->'user_name'->>'first_name';
    last_name_val := NEW.raw_user_meta_data->'user_name'->>'last_name';
    
    -- Fallback for older format or other variations
    IF first_name_val IS NULL THEN
      first_name_val := NEW.raw_user_meta_data->>'given_name';
      last_name_val := NEW.raw_user_meta_data->>'family_name';
    END IF;
  ELSE
    -- For email signup with our form
    first_name_val := NEW.raw_user_meta_data->>'first_name';
    last_name_val := NEW.raw_user_meta_data->>'last_name';
    
    -- Fallback: if we have a full_name but no first/last name (for backward compatibility)
    IF first_name_val IS NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
      first_name_val := SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1);
      last_name_val := SUBSTRING(NEW.raw_user_meta_data->>'full_name' FROM POSITION(' ' IN NEW.raw_user_meta_data->>'full_name') + 1);
    END IF;
  END IF;
  
  -- Get role and facility_id from metadata if available
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  user_facility_id := CAST(NEW.raw_user_meta_data->>'facility_id' AS UUID);
  
  -- If creating a facility user and no facility exists yet, create one
  IF user_role = 'facility' AND user_facility_id IS NULL THEN
    INSERT INTO facilities (name, address, contact_email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'facility_name', 'New Facility'),
      COALESCE(NEW.raw_user_meta_data->>'facility_address', ''),
      NEW.email
    )
    RETURNING id INTO user_facility_id;
  END IF;
  
  INSERT INTO public.profiles (id, first_name, last_name, role, facility_id)
  VALUES (
    NEW.id, 
    first_name_val,
    last_name_val,
    user_role,
    user_facility_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;