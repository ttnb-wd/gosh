-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['new_order'::text, 'order_cancelled'::text, 'payment_uploaded'::text, 'payment_verifying'::text, 'order_status_changed'::text])),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread'::text CHECK (status = ANY (ARRAY['unread'::text, 'read'::text, 'archived'::text])),
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id text,
  product_name text NOT NULL,
  product_brand text,
  product_image text,
  selected_size text,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0::numeric),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total numeric DEFAULT (price * (quantity)::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  payment_method text NOT NULL,
  payment_screenshot_url text,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0::numeric),
  status text NOT NULL DEFAULT 'Pending'::text CHECK (status = ANY (ARRAY['Pending'::text, 'Confirmed'::text, 'Processing'::text, 'Delivered'::text, 'Cancelled'::text])),
  payment_status text NOT NULL DEFAULT 'Unpaid'::text CHECK (payment_status = ANY (ARRAY['Unpaid'::text, 'Paid'::text, 'Verifying'::text, 'Failed'::text, 'Refunded'::text])),
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_phone text,
  payment_account_name text,
  payment_account_number text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  description text,
  image text,
  category text,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0::numeric),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  decants jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'customer'::text CHECK (role = ANY (ARRAY['customer'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.site_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  store_name text NOT NULL DEFAULT 'GOSH PERFUME'::text,
  store_tagline text DEFAULT 'Luxury Perfume'::text,
  store_email text,
  store_phone text,
  store_address text,
  city text,
  country text DEFAULT 'Myanmar'::text,
  enable_checkout boolean NOT NULL DEFAULT true,
  allow_cash_on_delivery boolean NOT NULL DEFAULT true,
  allow_kbzpay boolean NOT NULL DEFAULT true,
  allow_wavepay boolean NOT NULL DEFAULT true,
  allow_ayapay boolean NOT NULL DEFAULT true,
  allow_bank_transfer boolean NOT NULL DEFAULT true,
  free_delivery_enabled boolean NOT NULL DEFAULT true,
  delivery_fee numeric NOT NULL DEFAULT 0,
  minimum_order_amount numeric NOT NULL DEFAULT 0,
  kbzpay_account_name text,
  kbzpay_phone text,
  wavepay_account_name text,
  wavepay_phone text,
  ayapay_account_name text,
  ayapay_phone text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  announcement_enabled boolean NOT NULL DEFAULT false,
  announcement_text text,
  announcement_type text NOT NULL DEFAULT 'info'::text CHECK (announcement_type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'promo'::text])),
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  messenger_url text,
  order_auto_confirm boolean NOT NULL DEFAULT false,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text DEFAULT 'We are updating our store. Please check back soon.'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);
