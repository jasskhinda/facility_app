-- Migration to add is_owner field and mark existing facility owners
-- This should be run after the main schema update

-- Add the is_owner column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facility_users' AND column_name = 'is_owner') THEN
        ALTER TABLE facility_users ADD COLUMN is_owner BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add unique constraint for facility owner
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_facility_owner') THEN
        ALTER TABLE facility_users 
        ADD CONSTRAINT unique_facility_owner UNIQUE(facility_id) WHERE is_owner = TRUE;
    END IF;
    
    -- Add check constraint for owner role
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'owner_must_be_super_admin') THEN
        ALTER TABLE facility_users 
        ADD CONSTRAINT owner_must_be_super_admin CHECK (NOT is_owner OR role = 'super_admin');
    END IF;
END $$;

-- Mark existing facility users as owners based on who was there first or has super_admin role
-- This identifies the primary account holder for each facility
UPDATE facility_users 
SET is_owner = TRUE 
WHERE id IN (
    SELECT DISTINCT ON (facility_id) id
    FROM facility_users 
    WHERE role = 'super_admin' 
    AND status = 'active'
    ORDER BY facility_id, created_at ASC
);

-- If no super_admin exists for a facility, mark the earliest user as owner and upgrade to super_admin
UPDATE facility_users 
SET is_owner = TRUE, role = 'super_admin'
WHERE id IN (
    SELECT DISTINCT ON (fu.facility_id) fu.id
    FROM facility_users fu
    LEFT JOIN facility_users owner_check ON fu.facility_id = owner_check.facility_id AND owner_check.is_owner = TRUE
    WHERE owner_check.id IS NULL  -- No owner exists for this facility
    AND fu.status = 'active'
    ORDER BY fu.facility_id, fu.created_at ASC
);

-- Create or replace the owner protection function
CREATE OR REPLACE FUNCTION protect_facility_owner()
RETURNS TRIGGER AS $
BEGIN
  -- Prevent changing owner's role from super_admin
  IF OLD.is_owner = TRUE AND NEW.role != 'super_admin' THEN
    RAISE EXCEPTION 'Cannot change facility owner role from super_admin';
  END IF;
  
  -- Prevent removing owner status
  IF OLD.is_owner = TRUE AND NEW.is_owner = FALSE THEN
    RAISE EXCEPTION 'Cannot remove owner status from facility owner';
  END IF;
  
  -- Prevent deactivating owner
  IF OLD.is_owner = TRUE AND NEW.status != 'active' THEN
    RAISE EXCEPTION 'Cannot deactivate facility owner';
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS protect_facility_owner_trigger ON facility_users;
CREATE TRIGGER protect_facility_owner_trigger
BEFORE UPDATE ON facility_users
FOR EACH ROW
EXECUTE FUNCTION protect_facility_owner();

-- Verify the migration
SELECT 
    f.name as facility_name,
    p.first_name || ' ' || p.last_name as owner_name,
    p.email as owner_email,
    fu.role,
    fu.is_owner,
    fu.created_at
FROM facility_users fu
JOIN facilities f ON fu.facility_id = f.id
JOIN profiles p ON fu.user_id = p.id
WHERE fu.is_owner = TRUE
ORDER BY f.name;