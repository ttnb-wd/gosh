-- GOSH PERFUME Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  payment_method TEXT NOT NULL,
  payment_screenshot_url TEXT,
  payment_screenshot_name TEXT,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image TEXT,
  badge TEXT,
  stock INTEGER DEFAULT 0,
  category TEXT,
  decants JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Users Table (for role management)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Orders Policies
-- Allow public to insert orders (customer checkout)
CREATE POLICY "Allow public to insert orders"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated admin users to view all orders
CREATE POLICY "Allow admin to view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

-- Allow authenticated admin users to update orders
CREATE POLICY "Allow admin to update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

-- Products Policies
-- Allow public to view products
CREATE POLICY "Allow public to view products"
  ON products FOR SELECT
  TO public
  USING (true);

-- Allow authenticated admin users to manage products
CREATE POLICY "Allow admin to insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Allow admin to update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Allow admin to delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

-- Admin Users Policies
-- Only allow admins to view admin users
CREATE POLICY "Allow admin to view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (replace with your email)
-- INSERT INTO admin_users (email, role) VALUES ('admin@goshperfume.com', 'admin');

-- Seed some sample products (optional)
INSERT INTO products (name, brand, price, description, image, badge, stock, category, decants, is_active) VALUES
('Golden Noir', 'Dior', 89, 'Warm amber, vanilla, dark wood', 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop', 'Best Seller', 45, 'Woody', '[{"label":"5ml","price":12},{"label":"10ml","price":20},{"label":"20ml","price":35},{"label":"30ml","price":48}]'::jsonb, true),
('Velvet Oud', 'Chanel', 110, 'Deep oud, soft floral sweetness', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop', 'New', 32, 'Oriental', '[{"label":"5ml","price":15},{"label":"10ml","price":25},{"label":"20ml","price":42},{"label":"30ml","price":58}]'::jsonb, true),
('Midnight Amber', 'Gucci', 96, 'Elegant spicy amber evening', 'https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop', NULL, 28, 'Oriental', '[{"label":"5ml","price":13},{"label":"10ml","price":22},{"label":"20ml","price":38},{"label":"30ml","price":52}]'::jsonb, true),
('Sunlit Bloom', 'YSL', 78, 'Fresh citrus, soft floral finish', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop', 'Limited', 38, 'Floral', '[{"label":"5ml","price":10},{"label":"10ml","price":18},{"label":"20ml","price":30},{"label":"30ml","price":42}]'::jsonb, true),
('Royal Musk', 'Versace', 120, 'Luxury musk, powdery warmth', 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1200&auto=format&fit=crop', 'Best Seller', 25, 'Oriental', '[{"label":"5ml","price":16},{"label":"10ml","price":28},{"label":"20ml","price":48},{"label":"30ml","price":65}]'::jsonb, true),
('Night Elixir', 'Tom Ford', 99, 'Bold, rich statement scent', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1200&auto=format&fit=crop', NULL, 30, 'Woody', '[{"label":"5ml","price":14},{"label":"10ml","price":23},{"label":"20ml","price":39},{"label":"30ml","price":54}]'::jsonb, true),
('Ocean Breeze', 'Jo Malone', 85, 'Fresh marine, subtle citrus', 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop', 'New', 40, 'Fresh', '[{"label":"5ml","price":12},{"label":"10ml","price":19},{"label":"20ml","price":33},{"label":"30ml","price":46}]'::jsonb, true),
('Silk Essence', 'Armani', 105, 'Sophisticated floral blend', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop', NULL, 22, 'Floral', '[{"label":"5ml","price":14},{"label":"10ml","price":24},{"label":"20ml","price":41},{"label":"30ml","price":56}]'::jsonb, true),
('Rose Garden', 'Valentino', 115, 'Romantic rose, woody base', 'https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop', 'Limited', 18, 'Floral', '[{"label":"5ml","price":15},{"label":"10ml","price":26},{"label":"20ml","price":44},{"label":"30ml","price":60}]'::jsonb, true)
ON CONFLICT DO NOTHING;
