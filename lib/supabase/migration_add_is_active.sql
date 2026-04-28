-- Migration: Add is_active column to products table
-- Run this in your Supabase SQL Editor if you already have the products table

-- Add is_active column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing products to be active by default
UPDATE products 
SET is_active = true 
WHERE is_active IS NULL;

-- Create index for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
