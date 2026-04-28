# Duplicate Admin Notifications - FIXED ✅

## Problem
Admin notification bell was showing duplicate notifications:
- "New Order Received" appeared twice for the same order
- "Payment Proof Uploaded" also duplicated

## Root Cause
Notifications were being created from **TWO sources**:
1. ✅ Supabase database triggers (correct)
2. ❌ Frontend checkout code (causing duplicates)

## Solution Applied

### 1. Removed Frontend Notification Inserts ✅

**File:** `gosh-main/app/checkout/page.tsx`

**Removed:**
```typescript
// This code was REMOVED to prevent duplicates
await supabase.from("admin_notifications").insert({
  order_id: order.id,
  type: "new_order",
  title: "New Order Received",
  message: `${customerForm.fullName} placed order ${orderNumber}...`,
});

await supabase.from("admin_notifications").insert({
  order_id: order.id,
  type: "payment_uploaded",
  title: "Payment Proof Uploaded",
  message: `${customerForm.fullName} uploaded payment proof...`,
});
```

**Replaced with:**
```typescript
// NOTE: Admin notifications are now created by Supabase database triggers
// This prevents duplicate notifications from frontend + backend sources
```

### 2. Added Deduplication in Fetch ✅

**File:** `gosh-main/components/admin/AdminHeader.tsx`

**Added deduplication logic:**
```typescript
// Deduplicate by id
const uniqueNotifications = Array.from(
  new Map((data || []).map((item) => [item.id, item])).values()
);

setNotifications(uniqueNotifications);
```

### 3. Prevented Duplicate Realtime Additions ✅

**File:** `gosh-main/components/admin/AdminHeader.tsx`

**Updated realtime handler:**
```typescript
setNotifications((prev) => {
  const next = payload.new as AdminNotification;
  
  // Check if notification already exists
  if (prev.some((item) => item.id === next.id)) {
    console.log("Duplicate notification prevented:", next.id);
    return prev;
  }
  
  return [next, ...prev];
});
```

## What Changed

### Before:
- Order placed → Frontend inserts notification → Trigger also inserts → **2 notifications**
- Payment uploaded → Frontend inserts notification → Trigger also inserts → **2 notifications**

### After:
- Order placed → **Only trigger inserts** → 1 notification ✅
- Payment uploaded → **Only trigger inserts** → 1 notification ✅

## Files Modified

1. ✅ `gosh-main/app/checkout/page.tsx` - Removed frontend notification inserts
2. ✅ `gosh-main/components/admin/AdminHeader.tsx` - Added deduplication logic
3. ✅ `gosh-main/lib/supabase/cleanup_duplicate_notifications.sql` - Optional cleanup script

## Testing

### Test New Orders (No More Duplicates):
1. Open Admin Dashboard
2. Open browser console (F12)
3. Place a new order from checkout
4. Check console: Should see "Realtime notification received" **once**
5. Click bell: Should see **one** "New Order Received" notification

### Test Payment Upload (No More Duplicates):
1. Place order with payment screenshot
2. Check console: Should see **two** realtime events (new_order + payment_uploaded)
3. Click bell: Should see **two distinct** notifications (not 4)

### Console Output (Expected):
```
Fetched notifications: 2
Realtime subscription status: SUBSCRIBED
Realtime notification received: { type: "new_order", ... }
Realtime notification received: { type: "payment_uploaded", ... }
```

If duplicate somehow appears:
```
Duplicate notification prevented: abc-123-def-456
```

## Cleanup Existing Duplicates (Optional)

If you have existing duplicate notifications in your database, you can clean them up:

### Step 1: Preview Duplicates
Go to Supabase SQL Editor and run:
```sql
SELECT 
  order_id,
  type,
  COUNT(*) as duplicate_count
FROM admin_notifications
GROUP BY order_id, type
HAVING COUNT(*) > 1;
```

### Step 2: Run Cleanup Script
If you see duplicates, run the cleanup script:
```bash
# File: gosh-main/lib/supabase/cleanup_duplicate_notifications.sql
# Copy and paste into Supabase SQL Editor
```

The script will:
- Keep the **oldest** notification for each order_id + type
- Delete newer duplicates
- Preserve notification history

### Step 3: Verify Cleanup
```sql
SELECT order_id, type, COUNT(*) 
FROM admin_notifications 
GROUP BY order_id, type 
HAVING COUNT(*) > 1;
```

Should return **0 rows** (no duplicates).

## What Still Works

✅ Notification bell fetch  
✅ Realtime notifications  
✅ Unread count badge  
✅ Mark as read  
✅ Mark all as read  
✅ Click notification → navigate to orders  
✅ Order submission  
✅ Payment screenshot upload  
✅ Supabase triggers (source of truth)  

## What's Fixed

✅ No more duplicate "New Order Received"  
✅ No more duplicate "Payment Proof Uploaded"  
✅ Deduplication prevents UI duplicates  
✅ Realtime handler checks for existing IDs  
✅ Frontend no longer inserts notifications  

## Summary

**Before:** Frontend + Triggers = Duplicates ❌  
**After:** Only Triggers = No Duplicates ✅

The notification system now uses **Supabase database triggers as the single source of truth**, preventing duplicate notifications from appearing in the admin dashboard.
