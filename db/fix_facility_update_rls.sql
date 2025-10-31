-- Fix RLS policy for facilities table to allow facility role (super_admin) to update
-- The issue is that the policy checks facility_users table which uses 'super_admin' role
-- But the profiles table uses 'facility' role for the owner

-- Drop existing policy
DROP POLICY IF EXISTS "Facility admins can update facility" ON facilities;

-- Create new policy that checks both facility_users and profiles tables
CREATE POLICY "Facility admins can update facility"
ON facilities FOR UPDATE
USING (
  id = get_user_facility_id() AND (
    -- Check facility_users table (new multi-user system)
    check_facility_permission(ARRAY['super_admin', 'admin'])
    OR
    -- Check profiles table (legacy/fallback for 'facility' role)
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.facility_id = facilities.id
      AND profiles.role IN ('facility', 'super_admin', 'admin')
    )
  )
);

-- Also ensure SELECT policy allows facility role
DROP POLICY IF EXISTS "Facility users can view their facility" ON facilities;

CREATE POLICY "Facility users can view their facility"
ON facilities FOR SELECT
USING (
  id = get_user_facility_id()
  OR
  id IN (
    SELECT facility_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'facilities';
