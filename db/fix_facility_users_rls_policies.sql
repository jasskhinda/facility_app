-- =====================================================
-- Fix RLS Policies for facility_users table
-- Allow admin, scheduler, and all facility staff to access
-- =====================================================

-- Drop ALL existing policies (including old ones)
DROP POLICY IF EXISTS "Allow facility access via profiles" ON facility_users;
DROP POLICY IF EXISTS "Facility staff can view facility_users" ON facility_users;
DROP POLICY IF EXISTS "Facility staff can insert facility_users" ON facility_users;
DROP POLICY IF EXISTS "Facility staff can update facility_users" ON facility_users;
DROP POLICY IF EXISTS "Facility staff can delete facility_users" ON facility_users;

-- =====================================================
-- SELECT Policy - All facility staff can view
-- =====================================================
CREATE POLICY "Facility staff can view facility_users"
ON facility_users FOR SELECT
USING (
  facility_id IN (
    SELECT facility_id FROM profiles
    WHERE id = auth.uid()
    AND role IN ('facility', 'super_admin', 'admin', 'scheduler')
  )
);

-- =====================================================
-- INSERT Policy - Super Admin and Admin can add users
-- =====================================================
CREATE POLICY "Facility staff can insert facility_users"
ON facility_users FOR INSERT
WITH CHECK (
  facility_id IN (
    SELECT facility_id FROM profiles
    WHERE id = auth.uid()
    AND role IN ('facility', 'super_admin', 'admin')
  )
);

-- =====================================================
-- UPDATE Policy - Super Admin and Admin can update
-- =====================================================
CREATE POLICY "Facility staff can update facility_users"
ON facility_users FOR UPDATE
USING (
  facility_id IN (
    SELECT facility_id FROM profiles
    WHERE id = auth.uid()
    AND role IN ('facility', 'super_admin', 'admin')
  )
);

-- =====================================================
-- DELETE Policy - Super Admin and Admin can delete
-- =====================================================
CREATE POLICY "Facility staff can delete facility_users"
ON facility_users FOR DELETE
USING (
  facility_id IN (
    SELECT facility_id FROM profiles
    WHERE id = auth.uid()
    AND role IN ('facility', 'super_admin', 'admin')
  )
);

-- =====================================================
-- Verify policies were created
-- =====================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'facility_users'
ORDER BY policyname;
