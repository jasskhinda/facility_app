-- Fix facility_contracts RLS policies to support both facility_users and profiles tables
-- This ensures contracts work for users in either table

-- Drop existing policies
DROP POLICY IF EXISTS "Facility users can view contracts" ON facility_contracts;
DROP POLICY IF EXISTS "Facility admins can manage contracts" ON facility_contracts;

-- Policy for viewing contracts - checks both facility_users and profiles
CREATE POLICY "Facility staff can view contracts"
ON facility_contracts FOR SELECT
USING (
  -- Check facility_users table first
  facility_id IN (
    SELECT facility_id
    FROM facility_users
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
  OR
  -- Fallback to profiles table for backward compatibility
  facility_id IN (
    SELECT facility_id
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('facility', 'super_admin', 'admin', 'scheduler')
  )
);

-- Policy for managing contracts (INSERT, UPDATE, DELETE) - checks both tables
CREATE POLICY "Facility staff can manage contracts"
ON facility_contracts FOR ALL
USING (
  -- Check facility_users table first
  facility_id IN (
    SELECT facility_id
    FROM facility_users
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'scheduler')
    AND status = 'active'
  )
  OR
  -- Fallback to profiles table for backward compatibility
  facility_id IN (
    SELECT facility_id
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('facility', 'super_admin', 'admin', 'scheduler')
  )
);
