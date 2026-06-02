-- ============================================
-- PAYMENT VERIFICATION NOTIFICATION TRIGGER
-- ============================================
-- Creates admin notification when payment proof is uploaded
-- This helps admins know immediately when orders need payment verification

-- Create function to notify admin when payment screenshot is uploaded
CREATE OR REPLACE FUNCTION public.create_payment_verification_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification if payment_screenshot_url is added (not on updates of other fields)
  -- And payment status is Verifying (prepaid methods)
  IF OLD.payment_screenshot_url IS NULL 
     AND NEW.payment_screenshot_url IS NOT NULL
     AND NEW.payment_status = 'Verifying'
     AND NEW.payment_method IN ('kbzpay', 'wavepay', 'ayapay', 'bank')
  THEN
    INSERT INTO public.admin_notifications (order_id, type, title, message)
    VALUES (
      NEW.id,
      'payment_verifying',
      'Payment Proof Uploaded',
      COALESCE(NEW.customer_name, 'Customer') || ' uploaded payment proof for order ' || COALESCE(NEW.order_number, NEW.id::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_create_payment_verification_notification ON public.orders;

-- Create trigger on orders table
CREATE TRIGGER trg_create_payment_verification_notification
  AFTER UPDATE OF payment_screenshot_url ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_verification_notification();

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_payment_verification_notification() TO authenticated;
