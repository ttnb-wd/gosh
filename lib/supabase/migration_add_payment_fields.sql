-- Migration: Add payment fields to orders table
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add new payment fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid',
ADD COLUMN IF NOT EXISTS payment_account_name TEXT,
ADD COLUMN IF NOT EXISTS payment_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_account_number TEXT,
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;

-- Create order_items table for normalized order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_brand TEXT,
  product_image TEXT,
  selected_size TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Enable RLS for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated customers to insert items for their own orders
DROP POLICY IF EXISTS "Allow public to insert order items" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_for_own_order" ON order_items;
CREATE POLICY "order_items_insert_for_own_order"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Allow customers to view their own items and admins to view all items
DROP POLICY IF EXISTS "Allow admin to view order items" ON order_items;
DROP POLICY IF EXISTS "order_items_select_own_or_admin" ON order_items;
CREATE POLICY "order_items_select_own_or_admin"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Update order_number to be unique if not already
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Add index for payment_status
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Comment: 
-- payment_method values: 'cod', 'kbzpay', 'wavepay', 'ayapay', 'bank'
-- payment_status values: 'Unpaid', 'Verifying', 'Paid', 'Failed', 'Refunded'
-- status values: 'Pending', 'Confirmed', 'Delivered', 'Cancelled'
