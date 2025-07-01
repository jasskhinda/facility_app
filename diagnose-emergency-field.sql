-- Comprehensive diagnostic for is_emergency field issue

-- 1. Check all columns in trips table
SELECT 
    'Current trips columns:' as info,
    column_name, 
    data_type, 
    column_default,
    is_nullable,
    generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trips'
ORDER BY ordinal_position;

-- 2. Check for any views that might reference is_emergency
SELECT 
    'Views referencing is_emergency:' as info,
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%is_emergency%';

-- 3. Check for any functions that might reference is_emergency
SELECT 
    'Functions referencing is_emergency:' as info,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%is_emergency%';

-- 4. Check for any triggers on trips table
SELECT 
    'Triggers on trips table:' as info,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trips';

-- 5. Check RLS policies on trips table for any reference to is_emergency
SELECT 
    'RLS policies on trips:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'trips';

-- 6. Check for any indexes that might reference is_emergency
SELECT 
    'Indexes referencing is_emergency:' as info,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'trips'
AND indexdef LIKE '%is_emergency%';

-- 7. Check constraints on trips table
SELECT 
    'Constraints on trips:' as info,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'trips'::regclass;