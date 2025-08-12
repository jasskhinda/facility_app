-- SAFE Migration to add is_owner field without breaking existing functionality
-- This migration is designed to be non-destructive and backwards compatible

-- Step 1: Add the is_owner column safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'facility_users' AND column_name = 'is_owner') THEN
        ALTER TABLE facility_users ADD COLUMN is_owner BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_owner column to facility_users table';
    ELSE
        RAISE NOTICE 'is_owner column already exists, skipping';
    END IF;
END $$;

-- Step 2: Create a partial unique index instead of constraint (safer approach)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_facility_users_unique_owner') THEN
        CREATE UNIQUE INDEX idx_facility_users_unique_owner 
        ON facility_users (facility_id) 
        WHERE is_owner = TRUE;
        RAISE NOTICE 'Created unique index for facility owners';
    ELSE
        RAISE NOTICE 'Unique owner index already exists, skipping';
    END IF;
END $$;

-- Step 3: Mark existing facility owners (earliest super_admin per facility)
-- This is safe because it only updates existing records, doesn't delete anything
UPDATE facility_users 
SET is_owner = TRUE 
WHERE id IN (
    SELECT DISTINCT ON (facility_id) id
    FROM facility_users 
    WHERE role = 'super_admin' 
    AND status = 'active'
    ORDER BY facility_id, created_at ASC
);

-- Get count of owners created
DO $$
DECLARE
    owner_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO owner_count FROM facility_users WHERE is_owner = TRUE;
    RAISE NOTICE 'Marked % users as facility owners', owner_count;
END $$;

-- Step 4: For facilities without super_admins, promote earliest user to owner
-- This is also safe - only promotes existing users
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

-- Step 5: Create owner protection function (optional, can be skipped if you prefer)
CREATE OR REPLACE FUNCTION protect_facility_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply protection if is_owner column exists and is TRUE
  IF TG_OP = 'UPDATE' AND OLD.is_owner = TRUE THEN
    -- Prevent changing owner's role from super_admin
    IF NEW.role != 'super_admin' THEN
      RAISE EXCEPTION 'Cannot change facility owner role from super_admin';
    END IF;
    
    -- Prevent removing owner status
    IF NEW.is_owner = FALSE THEN
      RAISE EXCEPTION 'Cannot remove owner status from facility owner';
    END IF;
    
    -- Prevent deactivating owner
    IF NEW.status != 'active' THEN
      RAISE EXCEPTION 'Cannot deactivate facility owner';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'protect_facility_owner_trigger') THEN
        CREATE TRIGGER protect_facility_owner_trigger
        BEFORE UPDATE ON facility_users
        FOR EACH ROW
        EXECUTE FUNCTION protect_facility_owner();
        RAISE NOTICE 'Created owner protection trigger';
    ELSE
        RAISE NOTICE 'Owner protection trigger already exists, skipping';
    END IF;
END $$;

-- Step 7: Verification - Show current facility owners
SELECT 
    'FACILITY OWNERS AFTER MIGRATION:' as status;

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

-- Final status
SELECT 
    COUNT(*) as total_facility_users,
    COUNT(*) FILTER (WHERE is_owner = TRUE) as facility_owners,
    COUNT(*) FILTER (WHERE role = 'super_admin') as super_admins
FROM facility_users 
WHERE status = 'active';