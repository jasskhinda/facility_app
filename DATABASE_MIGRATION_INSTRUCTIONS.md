# DATABASE MIGRATION INSTRUCTIONS

## IMPORTANT: You need to apply this database migration to fix the facility_id column error

### Step 1: Access your Supabase Database
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Migration Script
Copy and paste the following SQL script into the SQL Editor and click "Run":

```sql
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
```

### Step 3: Create a Test Facility (for testing purposes)
After running the migration, run this to create a test facility and associate your user:

```sql
-- Create a test facility
INSERT INTO facilities (name, address, contact_email, facility_type)
VALUES (
  'Test Healthcare Facility',
  '123 Main St, City, State 12345',
  'contact@testfacility.com',
  'hospital'
);

-- Get the facility ID (you'll see this in the results)
SELECT id, name FROM facilities WHERE name = 'Test Healthcare Facility';

-- Update your user profile to be a facility admin (replace YOUR_USER_ID with your actual user ID)
-- You can find your user ID by going to Authentication > Users in Supabase dashboard
UPDATE profiles 
SET role = 'facility', facility_id = (SELECT id FROM facilities WHERE name = 'Test Healthcare Facility')
WHERE id = 'YOUR_USER_ID_HERE';
```

### Step 4: Verify the Migration
Run this query to verify everything worked:

```sql
-- Check if columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'trips') 
AND column_name = 'facility_id';

-- Check if facilities table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'facilities';
```

## After running the migration, your facility settings page should work without the "column does not exist" error.
