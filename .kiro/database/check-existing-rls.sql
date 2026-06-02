-- ============================================
-- CHECK EXISTING RLS STATUS
-- ============================================

-- 1. Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '🔴 RLS NOT Enabled'
    END as status
FROM pg_tables
WHERE schemaname IN ('public', 'storage')
ORDER BY 
    CASE WHEN rowsecurity THEN 0 ELSE 1 END,
    schemaname, 
    tablename;

-- 2. Check existing policies on PUBLIC schema tables
SELECT 
    schemaname,
    tablename,
    policyname,
    CASE cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE cmd::text
    END as operation,
    roles::text as applies_to
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check existing STORAGE policies (for buckets)
SELECT 
    schemaname,
    tablename,
    policyname,
    CASE cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE cmd::text
    END as operation,
    roles::text as applies_to
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;

-- 4. Check if is_admin() function exists
SELECT 
    routine_name,
    routine_type,
    '✅ Function exists (used by storage policies)' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'is_admin';

-- 5. Count policies by table
SELECT 
    pg_tables.tablename,
    COUNT(pg_policies.policyname) as policy_count,
    CASE 
        WHEN COUNT(pg_policies.policyname) = 0 THEN '🔴 No policies'
        WHEN COUNT(pg_policies.policyname) < 3 THEN '⚠️ Few policies'
        ELSE '✅ Multiple policies'
    END as coverage
FROM pg_tables
LEFT JOIN pg_policies ON pg_tables.tablename = pg_policies.tablename 
    AND pg_tables.schemaname = pg_policies.schemaname
WHERE pg_tables.schemaname = 'public'
    AND pg_tables.tablename IN (
        'profiles', 'brands', 'products', 'orders', 'order_items',
        'site_settings', 'website_settings', 'contact_messages',
        'newsletter_subscribers', 'testimonials', 'admin_notifications',
        'admin_audit_logs'
    )
GROUP BY pg_tables.tablename
ORDER BY policy_count, pg_tables.tablename;
