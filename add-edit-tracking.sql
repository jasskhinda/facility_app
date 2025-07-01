-- Add edit tracking columns to trips table
-- This script adds columns to track who edited the trip and when

-- Add edit tracking columns
ALTER TABLE trips ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS edited_by_role TEXT;

-- Add comments for clarity
COMMENT ON COLUMN trips.last_edited_by IS 'ID of the user who last edited this trip';
COMMENT ON COLUMN trips.last_edited_at IS 'Timestamp when the trip was last edited';
COMMENT ON COLUMN trips.edited_by_role IS 'Role of the user who last edited (dispatcher, facility, admin)';

-- Update the updated_at trigger to also set last_edited_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- If last_edited_by is being set, also update last_edited_at
  IF NEW.last_edited_by IS NOT NULL AND (OLD.last_edited_by IS NULL OR NEW.last_edited_by != OLD.last_edited_by) THEN
    NEW.last_edited_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trips'
AND column_name IN ('last_edited_by', 'last_edited_at', 'edited_by_role')
ORDER BY column_name;