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

-- Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL CHECK (
    action IN (
      'order_status_changed',
      'payment_status_changed',
      'product_created',
      'product_updated',
      'product_status_changed',
      'product_deleted'
    )
  ),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'product')),
  entity_id TEXT NOT NULL,
  entity_label TEXT,
  before_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON public.admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id ON public.admin_audit_logs(actor_id);
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
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
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

DROP FUNCTION IF EXISTS public.place_order(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  JSONB
);

CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_name TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_payment_method TEXT,
  p_payment_account_name TEXT,
  p_payment_phone TEXT,
  p_payment_account_number TEXT,
  p_payment_screenshot_url TEXT,
  p_items JSONB
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  customer_name TEXT,
  phone TEXT,
  total NUMERIC,
  payment_method TEXT,
  payment_status TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  saved_order public.orders;
  generated_order_number TEXT;
  cart_item RECORD;
  product_row public.products%ROWTYPE;
  settings_row public.site_settings%ROWTYPE;
  clean_quantity INTEGER;
  clean_selected_size TEXT;
  trusted_selected_size TEXT;
  trusted_price NUMERIC;
  computed_subtotal NUMERIC := 0;
  computed_delivery_fee NUMERIC := 0;
  computed_discount NUMERIC := 0;
  computed_total NUMERIC := 0;
  minimum_order_amount NUMERIC := 0;
  server_payment_status TEXT;
  trusted_items JSONB := '[]'::jsonb;
  customer_email TEXT;
BEGIN
  current_user_id := auth.uid();
  customer_email := lower(nullif(trim(COALESCE(auth.jwt() ->> 'email', '')), ''));

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Please login or create an account to place your order.' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must include at least one item.' USING ERRCODE = '22000';
  END IF;

  SELECT * INTO settings_row
  FROM public.site_settings
  WHERE site_settings.id = 1;

  IF p_payment_method = 'cod' THEN
    IF COALESCE(settings_row.allow_cash_on_delivery, true) IS NOT TRUE THEN
      RAISE EXCEPTION 'Cash on delivery is currently unavailable.' USING ERRCODE = '22000';
    END IF;
    server_payment_status := 'Unpaid';
  ELSIF p_payment_method = 'kbzpay' THEN
    IF COALESCE(settings_row.allow_kbzpay, true) IS NOT TRUE THEN
      RAISE EXCEPTION 'KBZPay is currently unavailable.' USING ERRCODE = '22000';
    END IF;
    server_payment_status := 'Verifying';
  ELSIF p_payment_method = 'wavepay' THEN
    IF COALESCE(settings_row.allow_wavepay, true) IS NOT TRUE THEN
      RAISE EXCEPTION 'WavePay is currently unavailable.' USING ERRCODE = '22000';
    END IF;
    server_payment_status := 'Verifying';
  ELSIF p_payment_method = 'ayapay' THEN
    IF COALESCE(settings_row.allow_ayapay, true) IS NOT TRUE THEN
      RAISE EXCEPTION 'AYA Pay is currently unavailable.' USING ERRCODE = '22000';
    END IF;
    server_payment_status := 'Verifying';
  ELSIF p_payment_method = 'bank' THEN
    IF COALESCE(settings_row.allow_bank_transfer, true) IS NOT TRUE THEN
      RAISE EXCEPTION 'Bank transfer is currently unavailable.' USING ERRCODE = '22000';
    END IF;
    server_payment_status := 'Verifying';
  ELSE
    RAISE EXCEPTION 'Invalid payment method.' USING ERRCODE = '22000';
  END IF;

  FOR cart_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS cart_item(
      product_id TEXT,
      selected_size TEXT,
      quantity INTEGER
    )
  LOOP
    clean_quantity := GREATEST(COALESCE(cart_item.quantity, 1), 1);

    IF clean_quantity > 99 THEN
      RAISE EXCEPTION 'Quantity is too high for one order.' USING ERRCODE = '22000';
    END IF;

    BEGIN
      SELECT * INTO product_row
      FROM public.products
      WHERE products.id = cart_item.product_id::UUID
        AND products.is_active = true
      FOR UPDATE;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'This product is not available for checkout. Please add products from the admin dashboard and try again.' USING ERRCODE = '22000';
    END;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One product in your cart is no longer available. Please remove it and add it again.' USING ERRCODE = '22000';
    END IF;

    IF COALESCE(product_row.stock, 0) < clean_quantity THEN
      RAISE EXCEPTION 'Only % left in stock for %. Please reduce quantity or choose another product.', COALESCE(product_row.stock, 0), product_row.name USING ERRCODE = '22000';
    END IF;

    clean_selected_size := nullif(trim(COALESCE(cart_item.selected_size, '')), '');
    trusted_selected_size := NULL;
    trusted_price := NULL;

    IF jsonb_array_length(COALESCE(product_row.decants, '[]'::jsonb)) > 0
      AND clean_selected_size IS NOT NULL
      AND lower(clean_selected_size) <> 'full size'
    THEN
      SELECT decant.label, decant.price
      INTO trusted_selected_size, trusted_price
      FROM jsonb_to_recordset(product_row.decants) AS decant(label TEXT, price NUMERIC)
      WHERE decant.label = clean_selected_size
        AND decant.price >= 0
      LIMIT 1;

      IF trusted_price IS NULL THEN
        RAISE EXCEPTION 'Selected decant size is no longer available for %.', product_row.name USING ERRCODE = '22000';
      END IF;
    ELSE
      trusted_price := COALESCE(product_row.price, 0);
      trusted_selected_size := CASE
        WHEN lower(COALESCE(product_row.category, '')) = 'accessories' THEN 'Accessory'
        WHEN jsonb_array_length(COALESCE(product_row.decants, '[]'::jsonb)) > 0 THEN 'Full Size'
        ELSE NULL
      END;
    END IF;

    UPDATE public.products
    SET
      stock = products.stock - clean_quantity,
      updated_at = NOW()
    WHERE products.id = product_row.id;

    computed_subtotal := computed_subtotal + (trusted_price * clean_quantity);
    trusted_items := trusted_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.id::TEXT,
      'product_name', product_row.name,
      'product_brand', product_row.brand,
      'product_image', product_row.image,
      'selected_size', trusted_selected_size,
      'price', trusted_price,
      'quantity', clean_quantity
    ));
  END LOOP;

  minimum_order_amount := COALESCE(settings_row.minimum_order_amount, 0);

  IF minimum_order_amount > 0 AND computed_subtotal < minimum_order_amount THEN
    RAISE EXCEPTION 'Minimum order amount is % MMK.', minimum_order_amount USING ERRCODE = '22000';
  END IF;

  computed_delivery_fee := CASE
    WHEN COALESCE(settings_row.free_delivery_enabled, true) THEN 0
    ELSE GREATEST(COALESCE(settings_row.delivery_fee, 0), 0)
  END;
  computed_discount := 0;
  computed_total := GREATEST(computed_subtotal + computed_delivery_fee - computed_discount, 0);

  generated_order_number := 'GOSH-' ||
    floor(extract(epoch from clock_timestamp()) * 1000)::BIGINT::TEXT ||
    '-' ||
    upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 4));

  INSERT INTO public.orders (
    order_number,
    user_id,
    customer_name,
    customer_email,
    phone,
    address,
    city,
    payment_method,
    payment_status,
    payment_account_name,
    payment_phone,
    payment_account_number,
    payment_screenshot_url,
    subtotal,
    delivery_fee,
    discount,
    total,
    status
  )
  VALUES (
    generated_order_number,
    current_user_id,
    trim(p_customer_name),
    customer_email,
    trim(p_phone),
    trim(p_address),
    trim(p_city),
    p_payment_method,
    server_payment_status,
    p_payment_account_name,
    p_payment_phone,
    p_payment_account_number,
    p_payment_screenshot_url,
    computed_subtotal,
    computed_delivery_fee,
    computed_discount,
    computed_total,
    'Pending'
  )
  RETURNING * INTO saved_order;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    product_brand,
    product_image,
    selected_size,
    price,
    quantity
  )
  SELECT
    saved_order.id,
    trusted_item.product_id,
    trim(trusted_item.product_name),
    trusted_item.product_brand,
    trusted_item.product_image,
    trusted_item.selected_size,
    trusted_item.price,
    trusted_item.quantity
  FROM jsonb_to_recordset(trusted_items) AS trusted_item(
    product_id TEXT,
    product_name TEXT,
    product_brand TEXT,
    product_image TEXT,
    selected_size TEXT,
    price NUMERIC,
    quantity INTEGER
  );

  RETURN QUERY
  SELECT
    saved_order.id,
    saved_order.order_number,
    saved_order.customer_name,
    saved_order.phone,
    saved_order.total,
    saved_order.payment_method,
    saved_order.payment_status,
    saved_order.status,
    saved_order.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB
) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_status TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_order public.orders;
  updated_order public.orders;
  actor_email TEXT;
  stock_item RECORD;
  uuid_pattern CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled') THEN
    RAISE EXCEPTION 'Invalid order status.' USING ERRCODE = '22000';
  END IF;

  SELECT * INTO previous_order
  FROM public.orders
  WHERE orders.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.' USING ERRCODE = '22000';
  END IF;

  IF previous_order.status IS DISTINCT FROM p_status THEN
    IF p_status = 'Cancelled' AND previous_order.status <> 'Cancelled' THEN
      UPDATE public.products AS product
      SET
        stock = product.stock + restored.quantity,
        updated_at = NOW()
      FROM (
        SELECT
          order_items.product_id::UUID AS product_id,
          SUM(order_items.quantity)::INTEGER AS quantity
        FROM public.order_items
        WHERE order_items.order_id = previous_order.id
          AND order_items.product_id ~* uuid_pattern
        GROUP BY order_items.product_id
      ) AS restored
      WHERE product.id = restored.product_id;
    ELSIF previous_order.status = 'Cancelled' AND p_status <> 'Cancelled' THEN
      FOR stock_item IN
        SELECT
          order_items.product_id::UUID AS product_id,
          COALESCE(NULLIF(trim(order_items.product_name), ''), 'product') AS product_name,
          SUM(order_items.quantity)::INTEGER AS quantity
        FROM public.order_items
        WHERE order_items.order_id = previous_order.id
          AND order_items.product_id ~* uuid_pattern
        GROUP BY order_items.product_id, order_items.product_name
      LOOP
        UPDATE public.products AS product
        SET
          stock = product.stock - stock_item.quantity,
          updated_at = NOW()
        WHERE product.id = stock_item.product_id
          AND product.stock >= stock_item.quantity;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Not enough stock to reopen cancelled order for %.', stock_item.product_name USING ERRCODE = '22000';
        END IF;
      END LOOP;
    END IF;
  END IF;

  UPDATE public.orders
  SET
    status = p_status,
    updated_at = NOW()
  WHERE orders.id = p_order_id
  RETURNING * INTO updated_order;

  IF previous_order.status IS DISTINCT FROM updated_order.status THEN
    actor_email := lower(nullif(trim(COALESCE(auth.jwt() ->> 'email', '')), ''));

    INSERT INTO public.admin_audit_logs (
      actor_id,
      actor_email,
      action,
      entity_type,
      entity_id,
      entity_label,
      before_data,
      after_data,
      metadata
    )
    VALUES (
      auth.uid(),
      actor_email,
      'order_status_changed',
      'order',
      updated_order.id::TEXT,
      updated_order.order_number,
      jsonb_build_object('status', previous_order.status),
      jsonb_build_object('status', updated_order.status),
      jsonb_build_object(
        'customer_name', updated_order.customer_name,
        'customer_email', updated_order.customer_email,
        'total', updated_order.total
      )
    );
  END IF;

  RETURN updated_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_payment_status(
  p_order_id UUID,
  p_payment_status TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_order public.orders;
  updated_order public.orders;
  actor_email TEXT;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF p_payment_status NOT IN ('Unpaid', 'Paid', 'Verifying', 'Failed', 'Refunded') THEN
    RAISE EXCEPTION 'Invalid payment status.' USING ERRCODE = '22000';
  END IF;

  SELECT * INTO previous_order
  FROM public.orders
  WHERE orders.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.' USING ERRCODE = '22000';
  END IF;

  IF p_payment_status = 'Paid'
    AND previous_order.payment_method IN ('kbzpay', 'wavepay', 'ayapay', 'bank')
    AND previous_order.payment_screenshot_url IS NULL
  THEN
    RAISE EXCEPTION 'Payment proof is missing. Upload or confirm proof before marking this prepaid order as Paid.' USING ERRCODE = '22000';
  END IF;

  UPDATE public.orders
  SET
    payment_status = p_payment_status,
    updated_at = NOW()
  WHERE orders.id = p_order_id
  RETURNING * INTO updated_order;

  IF previous_order.payment_status IS DISTINCT FROM updated_order.payment_status THEN
    actor_email := lower(nullif(trim(COALESCE(auth.jwt() ->> 'email', '')), ''));

    INSERT INTO public.admin_audit_logs (
      actor_id,
      actor_email,
      action,
      entity_type,
      entity_id,
      entity_label,
      before_data,
      after_data,
      metadata
    )
    VALUES (
      auth.uid(),
      actor_email,
      'payment_status_changed',
      'order',
      updated_order.id::TEXT,
      updated_order.order_number,
      jsonb_build_object('payment_status', previous_order.payment_status),
      jsonb_build_object('payment_status', updated_order.payment_status),
      jsonb_build_object(
        'customer_name', updated_order.customer_name,
        'customer_email', updated_order.customer_email,
        'payment_method', updated_order.payment_method,
        'total', updated_order.total
      )
    );
  END IF;

  RETURN updated_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_payment_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_product(
  p_product_id UUID,
  p_product JSONB
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_product public.products;
  saved_product public.products;
  audit_action TEXT;
  actor_email TEXT;
  next_name TEXT;
  next_brand TEXT;
  next_description TEXT;
  next_image TEXT;
  next_category TEXT;
  next_price NUMERIC;
  next_stock INTEGER;
  next_is_active BOOLEAN;
  next_is_featured BOOLEAN;
  next_decants JSONB;
  next_notes JSONB;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  next_name := nullif(trim(COALESCE(p_product ->> 'name', '')), '');
  IF next_name IS NULL THEN
    RAISE EXCEPTION 'Product name is required.' USING ERRCODE = '22000';
  END IF;

  next_brand := nullif(trim(COALESCE(p_product ->> 'brand', '')), '');
  next_description := nullif(trim(COALESCE(p_product ->> 'description', '')), '');
  next_image := nullif(trim(COALESCE(p_product ->> 'image', '')), '');
  next_category := nullif(trim(COALESCE(p_product ->> 'category', '')), '');
  next_price := GREATEST(COALESCE((p_product ->> 'price')::NUMERIC, 0), 0);
  next_stock := GREATEST(COALESCE((p_product ->> 'stock')::INTEGER, 0), 0);
  next_is_active := COALESCE((p_product ->> 'is_active')::BOOLEAN, true);
  next_is_featured := COALESCE((p_product ->> 'is_featured')::BOOLEAN, false);
  next_decants := COALESCE(p_product -> 'decants', '[]'::jsonb);
  next_notes := COALESCE(p_product -> 'notes', '{}'::jsonb);
  actor_email := lower(nullif(trim(COALESCE(auth.jwt() ->> 'email', '')), ''));

  IF p_product_id IS NULL THEN
    INSERT INTO public.products (
      name,
      brand,
      description,
      image,
      category,
      price,
      stock,
      is_active,
      is_featured,
      decants,
      notes
    )
    VALUES (
      next_name,
      next_brand,
      next_description,
      next_image,
      next_category,
      next_price,
      next_stock,
      next_is_active,
      next_is_featured,
      next_decants,
      next_notes
    )
    RETURNING * INTO saved_product;

    audit_action := 'product_created';
  ELSE
    SELECT * INTO previous_product
    FROM public.products
    WHERE products.id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found.' USING ERRCODE = '22000';
    END IF;

    UPDATE public.products
    SET
      name = next_name,
      brand = next_brand,
      description = next_description,
      image = next_image,
      category = next_category,
      price = next_price,
      stock = next_stock,
      is_active = next_is_active,
      is_featured = next_is_featured,
      decants = next_decants,
      notes = next_notes,
      updated_at = NOW()
    WHERE products.id = p_product_id
    RETURNING * INTO saved_product;

    audit_action := 'product_updated';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    entity_label,
    before_data,
    after_data
  )
  VALUES (
    auth.uid(),
    actor_email,
    audit_action,
    'product',
    saved_product.id::TEXT,
    saved_product.name,
    CASE
      WHEN p_product_id IS NULL THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'name', previous_product.name,
        'brand', previous_product.brand,
        'price', previous_product.price,
        'stock', previous_product.stock,
        'category', previous_product.category,
        'is_active', previous_product.is_active
      )
    END,
    jsonb_build_object(
      'name', saved_product.name,
      'brand', saved_product.brand,
      'price', saved_product.price,
      'stock', saved_product.stock,
      'category', saved_product.category,
      'is_active', saved_product.is_active
    )
  );

  RETURN saved_product;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_product(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_product_active(
  p_product_id UUID,
  p_is_active BOOLEAN
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_product public.products;
  saved_product public.products;
  actor_email TEXT;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO previous_product
  FROM public.products
  WHERE products.id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found.' USING ERRCODE = '22000';
  END IF;

  UPDATE public.products
  SET
    is_active = p_is_active,
    updated_at = NOW()
  WHERE products.id = p_product_id
  RETURNING * INTO saved_product;

  IF previous_product.is_active IS DISTINCT FROM saved_product.is_active THEN
    actor_email := lower(nullif(trim(COALESCE(auth.jwt() ->> 'email', '')), ''));

    INSERT INTO public.admin_audit_logs (
      actor_id,
      actor_email,
      action,
      entity_type,
      entity_id,
      entity_label,
      before_data,
      after_data,
      metadata
    )
    VALUES (
      auth.uid(),
      actor_email,
      'product_status_changed',
      'product',
      saved_product.id::TEXT,
      saved_product.name,
      jsonb_build_object('is_active', previous_product.is_active),
      jsonb_build_object('is_active', saved_product.is_active),
      jsonb_build_object(
        'brand', saved_product.brand,
        'category', saved_product.category
      )
    );
  END IF;

  RETURN saved_product;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_product_active(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_product(
  p_product_id UUID
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_product public.products;
  actor_email TEXT;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO previous_product
  FROM public.products
  WHERE products.id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found.' USING ERRCODE = '22000';
  END IF;

  DELETE FROM public.products
  WHERE products.id = p_product_id;

  actor_email := lower(nullif(trim(COALESCE(auth.jwt() ->> 'email', '')), ''));

  INSERT INTO public.admin_audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    entity_label,
    before_data
  )
  VALUES (
    auth.uid(),
    actor_email,
    'product_deleted',
    'product',
    previous_product.id::TEXT,
    previous_product.name,
    jsonb_build_object(
      'name', previous_product.name,
      'brand', previous_product.brand,
      'price', previous_product.price,
      'stock', previous_product.stock,
      'category', previous_product.category,
      'is_active', previous_product.is_active
    )
  );

  RETURN previous_product;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_product(UUID) TO authenticated;

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

-- Admin Audit Log Policies
DROP POLICY IF EXISTS "admin_audit_logs_admin_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_select"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_audit_logs_admin_insert" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_insert"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

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
