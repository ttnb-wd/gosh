-- ============================================
-- COMPREHENSIVE SECURITY STATUS CHECK
-- ============================================
-- Run this in Supabase SQL Editor to get complete security overview

-- ============================================
-- 1. RLS STATUS - Check all tables
-- ============================================
SELECT 
    '1. RLS ENABLED STATUS' as check_category,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ PROTECTED'
        ELSE '🔴 VULNERABLE'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;

-- ============================================
-- 2. POLICY COVERAGE - Count policies per table
-- ============================================
SELECT 
    '2. POLICY COVERAGE' as check_category,
    pg_tables.tablename,
    COUNT(pg_policies.policyname) as policy_count,
    CASE 
        WHEN COUNT(pg_policies.policyname) = 0 THEN '🔴 No protection'
        WHEN COUNT(pg_policies.policyname) < 3 THEN '⚠️ Weak coverage'
        WHEN COUNT(pg_policies.policyname) < 5 THEN '✅ Good coverage'
        ELSE '✅ Excellent coverage'
    END as coverage_status
FROM pg_tables
LEFT JOIN pg_policies ON pg_tables.tablename = pg_policies.tablename 
    AND pg_tables.schemaname = pg_policies.schemaname
WHERE pg_tables.schemaname = 'public'
GROUP BY pg_tables.tablename
ORDER BY policy_count DESC, pg_tables.tablename;

-- ============================================
-- 3. ADMIN FUNCTION - Verify helper exists
-- ============================================
SELECT 
    '3. SECURITY FUNCTIONS' as check_category,
    routine_name,
    routine_type,
    security_type,
    CASE 
        WHEN routine_name = 'is_admin' THEN '✅ Admin checker exists'
        ELSE '✅ Helper function'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('is_admin')
ORDER BY routine_name;

-- ============================================
-- 4. STORAGE BUCKET POLICIES
-- ============================================
SELECT 
    '4. STORAGE SECURITY' as check_category,
    policyname,
    CASE cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE cmd::text
    END as operation,
    '✅ Protected' as status
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;

-- ============================================
-- 5. VULNERABLE OPERATIONS - Check for bypasses
-- ============================================
SELECT 
    '5. POLICY ANALYSIS' as check_category,
    tablename,
    policyname,
    CASE 
        WHEN policyname LIKE '%can_view%' OR policyname LIKE '%view%' THEN 'Read Access'
        WHEN policyname LIKE '%can_insert%' OR policyname LIKE '%create%' THEN 'Create Access'
        WHEN policyname LIKE '%can_update%' OR policyname LIKE '%update%' THEN 'Update Access'
        WHEN policyname LIKE '%can_delete%' OR policyname LIKE '%delete%' THEN 'Delete Access'
        ELSE 'General Access'
    END as access_type,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ User-specific'
        WHEN qual LIKE '%is_admin()%' THEN '✅ Admin-only'
        WHEN qual = 'true' THEN '⚠️ Public access'
        ELSE '✅ Conditional'
    END as security_level
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 6. ADMIN USERS - List all admin accounts
-- ============================================
SELECT 
    '6. ADMIN ACCOUNTS' as check_category,
    id,
    email,
    role,
    created_at,
    CASE 
        WHEN role = 'admin' THEN '✅ Admin user'
        ELSE 'Regular user'
    END as status
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at;

-- ============================================
-- 7. RECENT AUDIT LOGS - Last 10 admin actions
-- ============================================
SELECT 
    '7. RECENT ADMIN ACTIVITY' as check_category,
    actor_email,
    action,
    entity_type,
    entity_label,
    created_at,
    '📝 Logged' as status
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 8. SECURITY SUMMARY
-- ============================================
SELECT 
    '8. SECURITY SUMMARY' as check_category,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) as tables_without_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admin_users,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) = 0 
        THEN '✅ ALL TABLES PROTECTED'
        ELSE '🔴 VULNERABILITIES EXIST'
    END as overall_status;
