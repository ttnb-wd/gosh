-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES - CLEAN INSTALL
-- ============================================
-- This version drops existing policies before creating new ones

-- ============================================
-- DROP EXISTING POLICIES (IF ANY)
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- CREATE OR REPLACE HELPER FUNCTION
-- ============================================
-- Note: is_admin() function already exists and is used by storage policies
-- We'll create or replace it to ensure it has the correct definition

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================

CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can insert own profile on signup"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- BRANDS TABLE POLICIES
-- ============================================

CREATE POLICY "Anyone can view active brands"
ON public.brands FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can view all brands"
ON public.brands FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can insert brands"
ON public.brands FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update brands"
ON public.brands FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete brands"
ON public.brands FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- PRODUCTS TABLE POLICIES
-- ============================================

CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can view all products"
ON public.products FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ORDERS TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Authenticated users can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can create orders"
ON public.orders FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Users can update own pending orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'Pending')
WITH CHECK (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "Admins can update all orders"
ON public.orders FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ORDER ITEMS TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all order items"
ON public.order_items FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Authenticated users can insert own order items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Anonymous users can insert order items"
ON public.order_items FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Admins can update order items"
ON public.order_items FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete order items"
ON public.order_items FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- SITE SETTINGS TABLE POLICIES
-- ============================================

CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ============================================
-- WEBSITE SETTINGS TABLE POLICIES
-- ============================================

CREATE POLICY "Anyone can view website settings"
ON public.website_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can update website settings"
ON public.website_settings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can insert website settings"
ON public.website_settings FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ============================================
-- CONTACT MESSAGES TABLE POLICIES
-- ============================================

CREATE POLICY "Anyone can create contact messages"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update contact messages"
ON public.contact_messages FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete contact messages"
ON public.contact_messages FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- NEWSLETTER SUBSCRIBERS TABLE POLICIES
-- ============================================

CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own subscription"
ON public.newsletter_subscribers FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all subscribers"
ON public.newsletter_subscribers FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update subscribers"
ON public.newsletter_subscribers FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subscribers"
ON public.newsletter_subscribers FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- TESTIMONIALS TABLE POLICIES
-- ============================================

CREATE POLICY "Anyone can view active testimonials"
ON public.testimonials FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can view all testimonials"
ON public.testimonials FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Anyone can create testimonials"
ON public.testimonials FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update testimonials"
ON public.testimonials FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete testimonials"
ON public.testimonials FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ADMIN NOTIFICATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "Admins can view notifications"
ON public.admin_notifications FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "System can create notifications"
ON public.admin_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update notifications"
ON public.admin_notifications FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete notifications"
ON public.admin_notifications FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ADMIN AUDIT LOGS TABLE POLICIES
-- ============================================

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Authenticated users can create audit logs"
ON public.admin_audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.brands TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.website_settings TO anon, authenticated;
GRANT SELECT ON public.testimonials TO anon, authenticated;

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT INSERT ON public.testimonials TO anon, authenticated;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT INSERT ON public.order_items TO anon, authenticated;

GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ RLS POLICIES SUCCESSFULLY APPLIED!';
    RAISE NOTICE '✅ All tables are now protected';
    RAISE NOTICE '⚠️  NEXT: Verify admin users have role=admin in profiles table';
END $$;
