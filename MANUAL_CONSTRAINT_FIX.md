# DATABASE CONSTRAINT FIX - MANUAL STEPS

Since the automated script can't run due to missing RPC functions, please follow these manual steps:

## Step 1: Run SQL in Supabase Dashboard

Go to your Supabase Dashboard > SQL Editor and run this SQL:

```sql
-- 1. Create exec_sql function (if it doesn't exist)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the user_id constraint issue
ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;

-- 3. Ensure managed_client_id column exists
ALTER TABLE trips ADD COLUMN IF NOT EXISTS managed_client_id UUID;

-- 4. Add constraint to ensure proper client reference
ALTER TABLE trips ADD CONSTRAINT IF NOT EXISTS trips_client_reference_check 
CHECK (
    (user_id IS NOT NULL AND managed_client_id IS NULL) OR 
    (user_id IS NULL AND managed_client_id IS NOT NULL)
);
```

## Step 2: Test the Fix

After running the SQL above, you can test booking trips for managed clients.

## Why This is Needed

- **StreamlinedBookingForm.js** correctly sets `user_id = null` for managed clients
- **FacilityBookingForm.js** now also sets `user_id = null` for managed clients  
- But the database constraint prevented this until now

## Expected Result

After the fix:
- ✅ Managed clients can book trips (user_id = NULL, managed_client_id = client_id)
- ✅ Authenticated clients can book trips (user_id = client_id, managed_client_id = NULL)
- ✅ No more "null value in column 'user_id' violates not-null constraint" errors

Run the SQL above and then test booking a trip for a managed client!
