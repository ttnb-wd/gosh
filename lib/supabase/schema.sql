-- GOSH PERFUME Database Schema
-- Run this in your Supabase SQL Editor for a fresh project.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  payment_account_name TEXT,
  payment_phone TEXT,
  payment_account_number TEXT,
  payment_screenshot_url TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled')),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_brand TEXT,
  product_image TEXT,
  selected_size TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description TEXT,
  image TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category TEXT,
  decants JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'GOSH PERFUME',
  store_tagline TEXT DEFAULT 'Luxury Perfume',
  store_email TEXT,
  store_phone TEXT,
  store_address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Myanmar',
  enable_checkout BOOLEAN NOT NULL DEFAULT true,
  allow_cash_on_delivery BOOLEAN NOT NULL DEFAULT true,
  allow_kbzpay BOOLEAN NOT NULL DEFAULT true,
  allow_wavepay BOOLEAN NOT NULL DEFAULT true,
  allow_ayapay BOOLEAN NOT NULL DEFAULT true,
  allow_bank_transfer BOOLEAN NOT NULL DEFAULT true,
  free_delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  kbzpay_account_name TEXT,
  kbzpay_phone TEXT,
  wavepay_account_name TEXT,
  wavepay_phone TEXT,
  ayapay_account_name TEXT,
  ayapay_phone TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  announcement_enabled BOOLEAN NOT NULL DEFAULT false,
  announcement_text TEXT,
  announcement_type TEXT NOT NULL DEFAULT 'info' CHECK (announcement_type IN ('info', 'success', 'warning', 'promo')),
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  messenger_url TEXT,
  order_auto_confirm BOOLEAN NOT NULL DEFAULT false,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT DEFAULT 'We are updating our store. Please check back soon.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  source TEXT NOT NULL DEFAULT 'vip_club',
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_subscribers_email_not_blank CHECK (length(trim(email)) > 3)
);

-- Admin Notifications Table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_order', 'order_cancelled', 'payment_uploaded', 'payment_verifying', 'order_status_changed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON public.newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at ON public.newsletter_subscribers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_new_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (order_id, type, title, message)
  VALUES (
    NEW.id,
    'new_order',
    'New Order Received',
    COALESCE(NEW.customer_name, 'Customer') || ' placed order ' || COALESCE(NEW.order_number, NEW.id::text)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_cancel_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'Cancelled'
  THEN
    INSERT INTO public.admin_notifications (order_id, type, title, message)
    VALUES (
      NEW.id,
      'order_cancelled',
      'Order Cancelled',
      COALESCE(NEW.customer_name, 'Customer') || ' cancelled order ' || COALESCE(NEW.order_number, NEW.id::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER update_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER update_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_create_new_order_notification ON public.orders;
CREATE TRIGGER trg_create_new_order_notification
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_order_notification();

DROP TRIGGER IF EXISTS trg_create_order_cancel_notification ON public.orders;
CREATE TRIGGER trg_create_order_cancel_notification
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_cancel_notification();

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

REVOKE INSERT ON public.contact_messages FROM anon;
GRANT INSERT ON public.contact_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
REVOKE INSERT, UPDATE ON public.newsletter_subscribers FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Orders Policies
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_select_own_or_admin" ON public.orders;
CREATE POLICY "orders_select_own_or_admin"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;
CREATE POLICY "orders_delete_admin"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Order Items Policies
DROP POLICY IF EXISTS "order_items_insert_for_own_order" ON public.order_items;
CREATE POLICY "order_items_insert_for_own_order"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "order_items_select_own_or_admin" ON public.order_items;
CREATE POLICY "order_items_select_own_or_admin"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Products Policies
DROP POLICY IF EXISTS "products_public_select_active" ON public.products;
CREATE POLICY "products_public_select_active"
  ON public.products FOR SELECT
  TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "products_admin_select_all" ON public.products;
CREATE POLICY "products_admin_select_all"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Site Settings Policies
DROP POLICY IF EXISTS "site_settings_public_select" ON public.site_settings;
CREATE POLICY "site_settings_public_select"
  ON public.site_settings FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
CREATE POLICY "site_settings_insert_admin"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_admin"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Contact Messages Policies
CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_full_name TEXT,
  p_email TEXT,
  p_subject TEXT,
  p_message TEXT
)
RETURNS public.contact_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT;
  clean_full_name TEXT;
  clean_subject TEXT;
  clean_message TEXT;
  recent_count INTEGER;
  saved_message public.contact_messages;
BEGIN
  normalized_email := lower(trim(p_email));
  clean_full_name := trim(p_full_name);
  clean_subject := trim(p_subject);
  clean_message := trim(p_message);

  IF length(clean_full_name) < 2 OR length(clean_full_name) > 120 THEN
    RAISE EXCEPTION 'Please enter a valid name.' USING ERRCODE = '22000';
  END IF;

  IF normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Please enter a valid email address.' USING ERRCODE = '22000';
  END IF;

  IF length(clean_subject) < 2 OR length(clean_subject) > 160 THEN
    RAISE EXCEPTION 'Please enter a valid subject.' USING ERRCODE = '22000';
  END IF;

  IF length(clean_message) < 10 OR length(clean_message) > 3000 THEN
    RAISE EXCEPTION 'Message must be between 10 and 3000 characters.' USING ERRCODE = '22000';
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.contact_messages
  WHERE lower(email) = normalized_email
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many messages sent recently. Please try again later.' USING ERRCODE = '42900';
  END IF;

  INSERT INTO public.contact_messages (
    full_name,
    email,
    subject,
    message,
    status
  )
  VALUES (
    clean_full_name,
    normalized_email,
    clean_subject,
    clean_message,
    'unread'
  )
  RETURNING * INTO saved_message;

  RETURN saved_message;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;

DROP POLICY IF EXISTS "contact_messages_admin_select" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_select"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_admin_update" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_update"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_admin_delete" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_delete"
  ON public.contact_messages FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(
  p_email TEXT,
  p_source TEXT DEFAULT 'vip_club'
)
RETURNS public.newsletter_subscribers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT;
  subscriber public.newsletter_subscribers;
BEGIN
  normalized_email := lower(trim(p_email));

  IF normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email address' USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.newsletter_subscribers (
    email,
    status,
    source,
    subscribed_at,
    unsubscribed_at
  )
  VALUES (
    normalized_email,
    'subscribed',
    COALESCE(NULLIF(trim(p_source), ''), 'vip_club'),
    NOW(),
    NULL
  )
  ON CONFLICT (email) DO UPDATE
  SET
    status = 'subscribed',
    source = EXCLUDED.source,
    subscribed_at = NOW(),
    unsubscribed_at = NULL,
    updated_at = NOW()
  RETURNING * INTO subscriber;

  RETURN subscriber;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(TEXT, TEXT) TO anon, authenticated;

-- Newsletter Subscribers Policies
DROP POLICY IF EXISTS "newsletter_subscribers_public_insert" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_public_resubscribe" ON public.newsletter_subscribers;

DROP POLICY IF EXISTS "newsletter_subscribers_admin_select" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_admin_select"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "newsletter_subscribers_admin_update" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_admin_update"
  ON public.newsletter_subscribers FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "newsletter_subscribers_admin_delete" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_admin_delete"
  ON public.newsletter_subscribers FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Admin Notifications Policies
DROP POLICY IF EXISTS "admin_notifications_admin_select" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_select"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_notifications_admin_update" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_update"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_notifications_admin_delete" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_delete"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Default singleton settings row
INSERT INTO public.site_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Seed sample products (optional)
INSERT INTO public.products (name, brand, price, description, image, stock, category, decants, is_active) VALUES
('Golden Noir', 'Dior', 89, 'Warm amber, vanilla, dark wood', 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop', 45, 'Woody', '[{"label":"5ml","price":12},{"label":"10ml","price":20},{"label":"20ml","price":35},{"label":"30ml","price":48}]'::jsonb, true),
('Velvet Oud', 'Chanel', 110, 'Deep oud, soft floral sweetness', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop', 32, 'Oriental', '[{"label":"5ml","price":15},{"label":"10ml","price":25},{"label":"20ml","price":42},{"label":"30ml","price":58}]'::jsonb, true),
('Midnight Amber', 'Gucci', 96, 'Elegant spicy amber evening', 'https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop', 28, 'Oriental', '[{"label":"5ml","price":13},{"label":"10ml","price":22},{"label":"20ml","price":38},{"label":"30ml","price":52}]'::jsonb, true),
('Sunlit Bloom', 'YSL', 78, 'Fresh citrus, soft floral finish', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop', 38, 'Floral', '[{"label":"5ml","price":10},{"label":"10ml","price":18},{"label":"20ml","price":30},{"label":"30ml","price":42}]'::jsonb, true),
('Royal Musk', 'Versace', 120, 'Luxury musk, powdery warmth', 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1200&auto=format&fit=crop', 25, 'Oriental', '[{"label":"5ml","price":16},{"label":"10ml","price":28},{"label":"20ml","price":48},{"label":"30ml","price":65}]'::jsonb, true),
('Night Elixir', 'Tom Ford', 99, 'Bold, rich statement scent', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1200&auto=format&fit=crop', 30, 'Woody', '[{"label":"5ml","price":14},{"label":"10ml","price":23},{"label":"20ml","price":39},{"label":"30ml","price":54}]'::jsonb, true),
('Ocean Breeze', 'Jo Malone', 85, 'Fresh marine, subtle citrus', 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop', 40, 'Fresh', '[{"label":"5ml","price":12},{"label":"10ml","price":19},{"label":"20ml","price":33},{"label":"30ml","price":46}]'::jsonb, true),
('Silk Essence', 'Armani', 105, 'Sophisticated floral blend', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop', 22, 'Floral', '[{"label":"5ml","price":14},{"label":"10ml","price":24},{"label":"20ml","price":41},{"label":"30ml","price":56}]'::jsonb, true),
('Rose Garden', 'Valentino', 115, 'Romantic rose, woody base', 'https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop', 18, 'Floral', '[{"label":"5ml","price":15},{"label":"10ml","price":26},{"label":"20ml","price":44},{"label":"30ml","price":60}]'::jsonb, true)
ON CONFLICT DO NOTHING;
