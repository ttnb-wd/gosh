-- Run this in Supabase SQL Editor to make checkout order creation atomic.
-- The order and all order_items are saved in one transaction by this RPC.

CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_payment_account_name TEXT,
  p_payment_phone TEXT,
  p_payment_account_number TEXT,
  p_payment_screenshot_url TEXT,
  p_subtotal NUMERIC,
  p_delivery_fee NUMERIC,
  p_discount NUMERIC,
  p_total NUMERIC,
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
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Please login or create an account to place your order.' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must include at least one item.' USING ERRCODE = '22000';
  END IF;

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
    lower(nullif(trim(p_customer_email), '')),
    trim(p_phone),
    trim(p_address),
    trim(p_city),
    p_payment_method,
    p_payment_status,
    p_payment_account_name,
    p_payment_phone,
    p_payment_account_number,
    p_payment_screenshot_url,
    COALESCE(p_subtotal, 0),
    COALESCE(p_delivery_fee, 0),
    COALESCE(p_discount, 0),
    COALESCE(p_total, 0),
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
    item.product_id,
    trim(item.product_name),
    item.product_brand,
    item.product_image,
    item.selected_size,
    COALESCE(item.price, 0),
    GREATEST(COALESCE(item.quantity, 1), 1)
  FROM jsonb_to_recordset(p_items) AS item(
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
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  JSONB
) TO authenticated;
