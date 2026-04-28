-- OPTIONAL: Cleanup Old Payment Notifications
-- Run this ONLY if you want to remove existing payment-related notifications
-- This will keep only order event notifications (new_order, order_cancelled)

-- Step 1: Preview what will be deleted
SELECT 
  id,
  type,
  title,
  message,
  created_at
FROM admin_notifications
WHERE type NOT IN ('new_order', 'order_cancelled')
ORDER BY created_at DESC;

-- Step 2: Count notifications to be deleted
SELECT 
  type,
  COUNT(*) as count
FROM admin_notifications
WHERE type NOT IN ('new_order', 'order_cancelled')
GROUP BY type;

-- Step 3: Delete old payment notifications
-- UNCOMMENT THE LINES BELOW TO RUN THE CLEANUP:

/*
DELETE FROM public.admin_notifications
WHERE type NOT IN ('new_order', 'order_cancelled');
*/

-- Step 4: Verify cleanup (should return 0 rows)
-- SELECT * FROM admin_notifications WHERE type NOT IN ('new_order', 'order_cancelled');

-- Step 5: Check remaining notifications
-- SELECT type, COUNT(*) FROM admin_notifications GROUP BY type;
