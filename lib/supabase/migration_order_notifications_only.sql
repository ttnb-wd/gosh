-- Update Admin Notifications to Order Events Only
-- This migration updates the admin_notifications table and triggers
-- to only create notifications for order events (new order, order cancelled)

-- Step 1: Update type constraint to allow only order events
-- First, drop the old constraint if it exists
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.admin_notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.admin_notifications DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

-- Add current notification type constraint
ALTER TABLE public.admin_notifications
ADD CONSTRAINT admin_notifications_type_check
CHECK (type IN ('new_order', 'order_cancelled', 'payment_uploaded', 'payment_verifying', 'order_status_changed'));

-- Step 2: Create/Replace New Order Notification Trigger
CREATE OR REPLACE FUNCTION public.create_new_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    order_id,
    type,
    title,
    message
  )
  VALUES (
    NEW.id,
    'new_order',
    'New Order Received',
    COALESCE(NEW.customer_name, 'Customer') || ' placed order ' || COALESCE(NEW.order_number, NEW.id::text)
  );
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_create_new_order_notification ON public.orders;

CREATE TRIGGER trg_create_new_order_notification
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_order_notification();

-- Step 3: Create/Replace Order Cancellation Notification Trigger
CREATE OR REPLACE FUNCTION public.create_order_cancel_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification when status changes to 'Cancelled'
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'Cancelled'
  THEN
    INSERT INTO public.admin_notifications (
      order_id,
      type,
      title,
      message
    )
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

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_create_order_cancel_notification ON public.orders;

CREATE TRIGGER trg_create_order_cancel_notification
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_cancel_notification();

-- Step 4: Drop any old payment-related triggers (if they exist)
DROP TRIGGER IF EXISTS trg_create_payment_notification ON public.orders;
DROP FUNCTION IF EXISTS public.create_payment_notification();

DROP TRIGGER IF EXISTS trg_create_payment_upload_notification ON public.orders;
DROP FUNCTION IF EXISTS public.create_payment_upload_notification();

DROP TRIGGER IF EXISTS trg_create_order_status_notification ON public.orders;
DROP FUNCTION IF EXISTS public.create_order_status_notification();

-- Verification queries (run these to verify the setup)
-- Check constraint:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.admin_notifications'::regclass AND contype = 'c';

-- Check triggers:
-- SELECT tgname, tgtype, tgenabled 
-- FROM pg_trigger 
-- WHERE tgrelid = 'public.orders'::regclass 
-- AND tgname LIKE '%notification%';

-- Check functions:
-- SELECT proname, prosrc 
-- FROM pg_proc 
-- WHERE proname LIKE '%notification%';
