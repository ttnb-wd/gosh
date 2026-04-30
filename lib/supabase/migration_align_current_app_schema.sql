-- Migration: Align existing Supabase projects with the current app code.
-- Run this after the older migrations if your project was created before schema.sql was updated.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles used by auth, admin checks, and customer management.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Orders and order items expected by checkout and admin notifications.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid',
  ADD COLUMN IF NOT EXISTS payment_account_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_phone TEXT,
  ADD COLUMN IF NOT EXISTS payment_account_number TEXT,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

DO $$
DECLARE
  orders_id_type TEXT;
BEGIN
  SELECT udt_name INTO orders_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'id';

  IF orders_id_type = 'uuid' THEN
    ALTER TABLE public.orders ALTER COLUMN id SET DEFAULT gen_random_uuid();
  ELSE
    RAISE NOTICE 'orders.id is %, not uuid. Fresh installs now use uuid ids. Existing text-id projects need a manual id migration before UUID notifications/order_items can be enforced.', orders_id_type;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

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

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Product columns used by the admin product manager.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.products
  ALTER COLUMN decants SET DEFAULT '[]'::jsonb;

-- Site settings used by checkout, contact, and admin settings.
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

INSERT INTO public.site_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Contact form messages shown in the admin Messages page.
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

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages(email);

-- Admin notifications with UUID order ids.
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_order', 'order_cancelled', 'payment_uploaded', 'payment_verifying', 'order_status_changed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated-at triggers.
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

-- Notification triggers.
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

-- RLS.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;

-- Drop older policy names that used legacy admin checks.
DROP POLICY IF EXISTS "Allow public to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin to view orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin to update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public to view products" ON public.products;
DROP POLICY IF EXISTS "Allow admin to insert products" ON public.products;
DROP POLICY IF EXISTS "Allow admin to update products" ON public.products;
DROP POLICY IF EXISTS "Allow admin to delete products" ON public.products;
DROP POLICY IF EXISTS "Allow public to insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow admin to view order items" ON public.order_items;

-- Profiles.
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

-- Orders.
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

-- Order items.
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

-- Products.
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

-- Site settings.
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

-- Contact messages.
DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;
CREATE POLICY "contact_messages_public_insert"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

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

-- Admin notifications.
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
