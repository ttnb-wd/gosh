-- Migration: Secure public contact form submissions behind a validated RPC.

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

REVOKE INSERT ON public.contact_messages FROM anon;

DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;
