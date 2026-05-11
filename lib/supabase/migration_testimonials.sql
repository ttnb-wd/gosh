-- Testimonials / customer comments without approval.
-- Run this in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  comment TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT testimonials_name_not_blank CHECK (length(trim(name)) >= 2),
  CONSTRAINT testimonials_comment_not_blank CHECK (length(trim(comment)) >= 3)
);

DROP POLICY IF EXISTS "Public can read approved active testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_public_select_approved" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_admin_select_all" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_admin_update" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_admin_delete" ON public.testimonials;

DROP INDEX IF EXISTS public.testimonials_is_approved_idx;
DROP INDEX IF EXISTS public.idx_testimonials_public;

ALTER TABLE public.testimonials
  DROP COLUMN IF EXISTS is_approved,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS testimonials_is_active_idx
ON public.testimonials(is_active);

CREATE INDEX IF NOT EXISTS testimonials_created_at_idx
ON public.testimonials(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_testimonials_updated_at ON public.testimonials;

CREATE TRIGGER set_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public can submit testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;

CREATE POLICY "Public can read active testimonials"
ON public.testimonials
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Public can submit testimonials"
ON public.testimonials
FOR INSERT
TO anon, authenticated
WITH CHECK (is_active = true);

CREATE POLICY "Admins can manage testimonials"
ON public.testimonials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.testimonials TO anon, authenticated;
GRANT UPDATE, DELETE ON public.testimonials TO authenticated;
