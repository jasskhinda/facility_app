# Fix for Client Creation Issue

## Problem
- Client creation shows "Client added successfully" 
- But clients don't appear on the dashboard
- This is because the `facility_managed_clients` table doesn't exist yet

## Solution
Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Create temporary table for facility-managed clients
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

-- Enable Row Level Security
ALTER TABLE facility_managed_clients ENABLE ROW LEVEL SECURITY;

-- Add policies for facility admins
CREATE POLICY "Facility admins can view their managed clients" 
ON facility_managed_clients FOR SELECT 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

CREATE POLICY "Facility admins can insert managed clients" 
ON facility_managed_clients FOR INSERT 
WITH CHECK (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

CREATE POLICY "Facility admins can update their managed clients" 
ON facility_managed_clients FOR UPDATE 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);

CREATE POLICY "Facility admins can delete their managed clients" 
ON facility_managed_clients FOR DELETE 
USING (
  facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
);
```

## Steps to Fix

1. **Go to your Supabase dashboard**
2. **Navigate to SQL Editor**
3. **Paste the SQL above**
4. **Click "Run"**
5. **Refresh your facility app dashboard**
6. **Try adding a client again**

## After Running SQL
The client creation should work properly and clients will appear in the dashboard.

## Alternative: Quick Test
If you want to test immediately without SQL:
1. Check the browser console for any errors
2. Check the server terminal for error messages
3. The API will now show a helpful error message if the table is missing
