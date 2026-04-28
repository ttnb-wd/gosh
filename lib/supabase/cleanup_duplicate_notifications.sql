-- OPTIONAL: Cleanup Duplicate Admin Notifications
-- Run this ONLY if you want to remove existing duplicate notifications from the database
-- This script keeps the oldest notification for each order_id + type combination

-- Preview duplicates before deleting (run this first to see what will be removed)
SELECT 
  order_id,
  type,
  COUNT(*) as duplicate_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM admin_notifications
GROUP BY order_id, type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Delete duplicate notifications (keeps the oldest one for each order_id + type)
-- UNCOMMENT THE LINES BELOW TO RUN THE CLEANUP:

/*
DELETE FROM admin_notifications
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY order_id, type 
        ORDER BY created_at ASC
      ) as row_num
    FROM admin_notifications
  ) ranked
  WHERE row_num > 1
);
*/

-- After cleanup, verify no duplicates remain:
-- SELECT order_id, type, COUNT(*) 
-- FROM admin_notifications 
-- GROUP BY order_id, type 
-- HAVING COUNT(*) > 1;
