-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================
-- Run this query to check if RLS is enabled on all tables

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ Protected'
        ELSE '🔴 VULNERABLE'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles',
        'brands',
        'products',
        'orders',
        'order_items',
        'site_settings',
        'website_settings',
        'contact_messages',
        'newsletter_subscribers',
        'testimonials',
        'admin_notifications',
        'admin_audit_logs'
    )
ORDER BY tablename;

-- ============================================
-- VIEW ALL POLICIES
-- ============================================
-- Run this to see all active RLS policies

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- CHECK ADMIN FUNCTION EXISTS
-- ============================================

SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'is_admin' THEN '✅ Exists'
        ELSE '⚠️ Check function'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'is_admin';
