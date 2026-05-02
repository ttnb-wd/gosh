-- Migration: Store VIP/newsletter subscribers from the storefront.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  source TEXT NOT NULL DEFAULT 'vip_club',
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id),
  CONSTRAINT newsletter_subscribers_email_not_blank CHECK (length(trim(email)) > 3)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
  ON public.newsletter_subscribers(status);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at
  ON public.newsletter_subscribers(created_at DESC);

DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER update_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON public.newsletter_subscribers FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;

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
