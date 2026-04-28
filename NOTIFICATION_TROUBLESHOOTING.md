# Admin Notification System - Troubleshooting Guide

## ✅ What's Been Fixed

1. **Added refresh on dropdown open** - Notifications now fetch when you click the bell
2. **Added console logging** - Check browser console for debugging info
3. **Added realtime subscription status** - Monitor connection status

## 🔍 Testing Steps

### Step 1: Verify Database Setup

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Check if table exists
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 5;

-- Check if is_admin function exists
SELECT public.is_admin();

-- Verify your admin role
SELECT id, email, role FROM profiles WHERE role = 'admin';
```

### Step 2: Enable Realtime on Table

Go to Supabase Dashboard → Database → Replication:

1. Find `admin_notifications` table
2. Enable "Realtime" toggle
3. Save changes

### Step 3: Test Notification Insert

In Supabase SQL Editor, manually insert a test notification:

```sql
INSERT INTO admin_notifications (order_id, type, title, message)
VALUES (
  (SELECT id FROM orders LIMIT 1),
  'new_order',
  'Test Notification',
  'This is a test notification'
);
```

### Step 4: Check Browser Console

Open Admin Dashboard → Press F12 → Console tab

Look for these logs:
- ✅ "Fetched notifications: X" - Fetch is working
- ✅ "Realtime subscription status: SUBSCRIBED" - Realtime connected
- ✅ "Realtime notification received: {...}" - New notifications arriving
- ❌ "Notification fetch error" - Check RLS policies
- ❌ "CHANNEL_ERROR" - Check Realtime is enabled

### Step 5: Test Full Flow

1. **Open Admin Dashboard** in one browser window
2. **Open Customer Checkout** in incognito/another browser
3. **Place an order** with payment screenshot
4. **Check Admin Dashboard** - Bell should show unread count
5. **Click bell** - Should see 2 notifications (new order + payment uploaded)

## 🐛 Common Issues & Fixes

### Issue 1: No notifications showing

**Check:**
```sql
-- Are there any notifications in the database?
SELECT COUNT(*) FROM admin_notifications;
```

**Fix:** If count is 0, place a test order or insert manually.

---

### Issue 2: "Notification fetch error" in console

**Check RLS Policies:**
```sql
-- Verify admin can read notifications
SELECT * FROM admin_notifications LIMIT 1;
```

**Fix:** Re-run the migration file:
```bash
# Copy content from: gosh-main/lib/supabase/migration_admin_notifications.sql
# Paste in Supabase SQL Editor and run
```

---

### Issue 3: Realtime not working (status: CHANNEL_ERROR)

**Check Realtime is enabled:**
1. Supabase Dashboard → Database → Replication
2. Find `admin_notifications` table
3. Enable "Realtime" toggle

**Check Realtime is allowed in RLS:**
```sql
-- Realtime needs SELECT permission
-- Already included in migration, but verify:
GRANT SELECT ON admin_notifications TO authenticated;
```

---

### Issue 4: Notifications not inserting from checkout

**Check checkout logs:**
1. Open checkout page
2. Open browser console (F12)
3. Place order
4. Look for: "Notification insert error"

**Fix:** Verify the insert policy allows anyone to insert:
```sql
-- This should exist from migration:
CREATE POLICY "admins_can_insert_notifications"
  ON admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

### Issue 5: User is not admin

**Check your profile role:**
```sql
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

**Fix:** Update your role to admin:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

---

## 📊 Expected Console Output

When everything works correctly:

```
Fetched notifications: 2
Realtime subscription status: SUBSCRIBED
[User places order]
Realtime notification received: { id: "...", type: "new_order", ... }
Realtime notification received: { id: "...", type: "payment_uploaded", ... }
[User clicks bell]
Fetched notifications: 2
```

## 🔧 Quick Fixes

### Force refresh notifications:
```javascript
// In browser console on admin dashboard:
window.location.reload();
```

### Clear and refetch:
```javascript
// In browser console:
localStorage.clear();
window.location.reload();
```

### Check Supabase connection:
```javascript
// In browser console:
const { createSupabaseClient } = await import('./lib/supabase/client');
const supabase = createSupabaseClient();
const { data, error } = await supabase.from('admin_notifications').select('*');
console.log('Data:', data, 'Error:', error);
```

## 📝 Files Modified

- ✅ `components/admin/AdminHeader.tsx` - Added refresh on open + logging
- ✅ `app/checkout/page.tsx` - Notification inserts (already done)
- ✅ `lib/supabase/migration_admin_notifications.sql` - Database setup

## 🎯 Next Steps

1. Open browser console (F12)
2. Go to Admin Dashboard
3. Check console for "Fetched notifications" and "Realtime subscription status"
4. Place a test order
5. Watch for "Realtime notification received" in console
6. Click bell - should see notifications

If you see errors, check the specific issue above and apply the fix!
