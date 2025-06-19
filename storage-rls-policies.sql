-- Simplified Storage RLS Policies for Contract Management
-- Use the Supabase Dashboard Storage → Policies section to create these

-- Policy 1: "Facility contract management" - All operations
-- Policy Definition:
-- bucket_id = 'contracts' AND owner_id = auth.uid()

-- Policy 2: "Contract viewing" - Select only  
-- Policy Definition:
-- bucket_id = 'contracts' AND auth.uid() IS NOT NULL

-- Instructions:
-- 1. Go to Supabase Dashboard → Storage → Policies
-- 2. Click "New Policy" 
-- 3. Copy the policy definitions above into the policy editor
-- 4. Save each policy

-- Note: These simplified policies allow:
-- - Any authenticated facility user to manage their own uploaded contracts
-- - Any authenticated user to view contracts (needed for PDF iframe viewing)

-- Optional: If you need to drop these policies later, use:
-- DROP POLICY IF EXISTS "Facility contract management" ON storage.objects;
-- DROP POLICY IF EXISTS "Contract viewing" ON storage.objects;
