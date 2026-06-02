-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- This file enables RLS on all tables and creates security policies
-- Run this in your Supabase SQL Editor to secure your database

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
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- New users can insert their profile (on signup)
CREATE POLICY "Users can insert own profile on signup"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- BRANDS TABLE POLICIES
-- ============================================

-- Anyone can view active brands (public access for storefront)
CREATE POLICY "Anyone can view active brands"
ON public.brands
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins can view all brands (including inactive)
CREATE POLICY "Admins can view all brands"
ON public.brands
FOR SELECT
TO authenticated
USING (is_admin());

-- Only admins can insert brands
CREATE POLICY "Admins can insert brands"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update brands
CREATE POLICY "Admins can update brands"
ON public.brands
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete brands
CREATE POLICY "Admins can delete brands"
ON public.brands
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- PRODUCTS TABLE POLICIES
-- ============================================

-- Anyone can view active products (public access for storefront)
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins can view all products (including inactive)
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (is_admin());

-- Only admins can insert products
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update products
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete products
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ORDERS TABLE POLICIES
-- ============================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (is_admin());

-- Authenticated users can create orders
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Anonymous users can create orders (guest checkout)
CREATE POLICY "Anonymous users can create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Users can update their own pending orders (for payment screenshots)
CREATE POLICY "Users can update own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'Pending')
WITH CHECK (auth.uid() = user_id AND status = 'Pending');

-- Admins can update all orders
CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete orders
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ORDER ITEMS TABLE POLICIES
-- ============================================

-- Users can view their own order items
CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Admins can view all order items
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (is_admin());

-- Authenticated users can insert order items for their orders
CREATE POLICY "Authenticated users can insert own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Anonymous users can insert order items (guest checkout)
CREATE POLICY "Anonymous users can insert order items"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (true);

-- Only admins can update order items
CREATE POLICY "Admins can update order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete order items
CREATE POLICY "Admins can delete order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- SITE SETTINGS TABLE POLICIES
-- ============================================

-- Anyone can view site settings (needed for storefront configuration)
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can insert site settings
CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ============================================
-- WEBSITE SETTINGS TABLE POLICIES
-- ============================================

-- Anyone can view website settings (needed for storefront)
CREATE POLICY "Anyone can view website settings"
ON public.website_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can update website settings
CREATE POLICY "Admins can update website settings"
ON public.website_settings
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can insert website settings
CREATE POLICY "Admins can insert website settings"
ON public.website_settings
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ============================================
-- CONTACT MESSAGES TABLE POLICIES
-- ============================================

-- Anyone can create contact messages
CREATE POLICY "Anyone can create contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view contact messages
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (is_admin());

-- Only admins can update contact messages
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete contact messages
CREATE POLICY "Admins can delete contact messages"
ON public.contact_messages
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- NEWSLETTER SUBSCRIBERS TABLE POLICIES
-- ============================================

-- Anyone can subscribe to newsletter
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Users can update their own subscription (unsubscribe)
CREATE POLICY "Users can update own subscription"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can view all subscribers
CREATE POLICY "Admins can view all subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (is_admin());

-- Admins can update any subscription
CREATE POLICY "Admins can update subscribers"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Admins can delete subscribers
CREATE POLICY "Admins can delete subscribers"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- TESTIMONIALS TABLE POLICIES
-- ============================================

-- Anyone can view active testimonials
CREATE POLICY "Anyone can view active testimonials"
ON public.testimonials
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins can view all testimonials
CREATE POLICY "Admins can view all testimonials"
ON public.testimonials
FOR SELECT
TO authenticated
USING (is_admin());

-- Anyone can create testimonials (submitted for review)
CREATE POLICY "Anyone can create testimonials"
ON public.testimonials
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can update testimonials
CREATE POLICY "Admins can update testimonials"
ON public.testimonials
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete testimonials
CREATE POLICY "Admins can delete testimonials"
ON public.testimonials
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ADMIN NOTIFICATIONS TABLE POLICIES
-- ============================================

-- Only admins can view notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (is_admin());

-- System can create notifications (via triggers)
CREATE POLICY "System can create notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can update notifications
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- ADMIN AUDIT LOGS TABLE POLICIES
-- ============================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (is_admin());

-- Authenticated users can create audit logs (via triggers)
CREATE POLICY "Authenticated users can create audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- No one can update or delete audit logs (immutable)
-- Audit logs should never be updated or deleted for integrity

-- ============================================
-- GRANT USAGE ON SCHEMA
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ============================================
-- GRANT TABLE PERMISSIONS
-- ============================================

-- Public read access for storefront tables
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.website_settings TO anon, authenticated;
GRANT SELECT ON public.testimonials TO anon, authenticated;

-- Allow public to insert contact messages and newsletter subscriptions
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT INSERT ON public.testimonials TO anon, authenticated;

-- Allow public to create orders (guest checkout)
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT INSERT ON public.order_items TO anon, authenticated;

-- Authenticated users need select on orders
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;

-- ============================================
-- INSTRUCTIONS
-- ============================================

-- To apply these policies:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard -> SQL Editor
-- 3. Paste and run this SQL
-- 4. Verify RLS is enabled by checking the table settings
-- 5. Test your application to ensure it works correctly
--
-- IMPORTANT NOTES:
-- - RLS is now enabled on all tables
-- - Admins (users with role='admin' in profiles table) have full access
-- - Regular users can only access their own data
-- - Public (anon) users can view products and create orders (guest checkout)
-- - All sensitive admin data is protected
-- 
-- After enabling RLS, make sure:
-- - Your application uses Supabase Auth for authenticated requests
-- - Admin users have role='admin' in the profiles table
-- - Test both admin and customer workflows
