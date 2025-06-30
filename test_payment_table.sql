-- Test Script to Verify Payment Tables Setup
-- Run this after setup_payment_tables.sql

-- 1. Check if facility_payment_methods table exists
SELECT 
    'facility_payment_methods table exists' as status,
    count(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'facility_payment_methods';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'facility_payment_methods'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'facility_payment_methods';

-- 4. Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'facility_payment_methods';

-- 5. Check if facilities table has stripe_customer_id column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'facilities' AND column_name = 'stripe_customer_id'
        ) 
        THEN 'stripe_customer_id column exists in facilities table'
        ELSE 'stripe_customer_id column missing from facilities table'
    END as stripe_column_status;

-- 6. Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'facility_payment_methods';

-- 7. Test basic table access (this should not error)
SELECT 'Table access test passed' as test_result
WHERE EXISTS (SELECT 1 FROM facility_payment_methods LIMIT 0);

-- Success message
SELECT 'All tests completed! Check results above.' as final_status;