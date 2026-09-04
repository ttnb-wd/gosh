# Promotion System - Quick Start Guide

## 🚀 For Admins: Creating Your First Promotion

### Step 1: Access Admin Dashboard
1. Navigate to your admin dashboard
2. Click **"Promotions"** in the sidebar (Megaphone icon)

### Step 2: Create Promotion

#### Option A: Generic Promotion (Sale/Discount)
```
1. Click "Create Promotion"
2. Type: Select "Promotion"
3. Title: "Summer Sale - 20% Off All Fragrances"
4. Description: "Discover luxury scents at incredible prices this summer"
5. Upload Image: Choose a promotional banner image
6. CTA Text: "Shop Sale"
7. CTA URL: "/products"
8. Start Date: Today, 12:00 AM
9. End Date: 7 days from now, 11:59 PM
10. Check "Active" box
11. Click "Create Promotion"
```

#### Option B: New Product Announcement
```
1. Click "Create Promotion"
2. Type: Select "New Product Announcement"
3. Select Product: Choose the new product from dropdown
4. Title: "Just Arrived: Midnight Oud"
5. Description: "Experience our newest signature fragrance"
6. Upload Image: (Optional - uses product image if not provided)
7. CTA Text: "Discover Now"
8. CTA URL: "/products/midnight-oud-id"
9. Start Date: Product launch date
10. End Date: 30 days from launch
11. Check "Active" box
12. Click "Create Promotion"
```

### Step 3: Verify on Homepage
1. Visit your website homepage
2. Scroll to after "Curated Collections" section
3. Your promotion should be visible

---

## 📊 Understanding Status

| Status Badge | Meaning | What to Do |
|--------------|---------|------------|
| 🟢 **Active** | Currently visible to customers | Nothing - it's working! |
| ⚪ **Inactive** | Admin turned OFF | Toggle ON if you want it visible |
| 🔵 **Scheduled** | Will start in the future | Wait, or edit dates to start now |
| 🔴 **Expired** | End date has passed | Extend dates or create new promotion |

---

## ✏️ Editing a Promotion

1. Find the promotion in the list
2. Click the **Edit** button (pencil icon)
3. Modify any field
4. Click "Update Promotion"

**Common edits:**
- Extend end date for popular promotions
- Change CTA URL to different product page
- Update description text
- Replace image

---

## 🔄 Turning Promotions ON/OFF

Click the **Power** button next to any promotion to instantly toggle its visibility:
- 🟢 Green = ON (visible to customers)
- ⚪ Gray = OFF (hidden from customers)

**Use cases:**
- Pause promotion during restocking
- Test before making public
- Temporarily hide without deleting

---

## 🗑️ Deleting a Promotion

1. Click the **Trash** icon
2. Confirm deletion
3. ImageKit files are automatically cleaned up

⚠️ **Warning**: This is permanent and cannot be undone!

---

## 💡 Pro Tips

### Multiple Promotions
- Create multiple promotions for auto-rotation
- Customers see them cycle every 8 seconds
- Up/down navigation available

### Scheduling
- Schedule promotions days/weeks in advance
- They automatically become visible at start time
- Automatically hide when expired

### Images
- Recommended size: **1200 x 600 pixels**
- Use high-quality images
- Test in both light and dark mode
- For new products, you can skip upload and use product image

### CTA URLs
Common examples:
- All products: `/products`
- Specific collection: `/products?collection=Summer`
- Specific product: `/products?id=PRODUCT_ID`
- External: `https://example.com`

### Date Tips
- Always use future dates for scheduled launches
- Add buffer time (start 1 day before actual launch)
- Set end dates conservatively (easier to extend than shorten)

---

## 🐛 Troubleshooting

### "Promotion not visible on homepage"
✅ Check these:
1. Is "Active" toggled ON?
2. Is current date between Start and End dates?
3. Did you save the promotion?
4. Try refreshing the homepage

### "Can't select product"
- Only active products appear in dropdown
- Check product is marked as "active" in Products section

### "Image won't upload"
- Check image size (max 10MB)
- Supported formats: JPG, PNG, WebP
- Try refreshing the page and uploading again

### "Wrong dates showing"
- Check your timezone
- Firestore uses UTC - conversion happens automatically
- Use datetime-local picker for accurate scheduling

---

## 📱 Testing Checklist

Before activating a promotion, test:

- [ ] Light mode appearance
- [ ] Dark mode appearance
- [ ] Desktop view (1920px)
- [ ] Tablet view (768px)
- [ ] Mobile view (375px)
- [ ] CTA link works correctly
- [ ] Image loads properly
- [ ] Text is readable
- [ ] Status shows "Active" when enabled

---

## 🎯 Best Practices

### DO ✅
- Use clear, compelling titles
- Write concise descriptions (2-3 lines max)
- Set realistic date ranges
- Test on mobile before activating
- Keep 2-3 active promotions max for rotation
- Use high-quality images

### DON'T ❌
- Don't create overlapping identical promotions
- Don't use tiny images (will look pixelated)
- Don't set end dates too far in the future
- Don't forget to toggle "Active" ON
- Don't use extremely long titles (breaks layout)

---

## 📞 Need Help?

If something isn't working:
1. Check status badge
2. Verify dates are correct
3. Confirm "Active" is checked
4. Try toggling OFF then ON again
5. Check browser console for errors

---

## 🔄 Common Workflows

### Weekend Flash Sale
```
Friday 5 PM: Create promotion
- Start: Friday 6 PM
- End: Sunday 11:59 PM
- Active: ON
- Monitor through weekend
```

### Product Launch Campaign
```
2 weeks before launch: Create announcement
- Start: Launch date
- End: 30 days after launch
- Active: ON
- Status shows "Scheduled"
```

### Seasonal Collection
```
Start of season: Create promotion
- Start: Today
- End: End of season (3 months)
- Active: ON
- Extend if successful
```

---

**That's it! You're ready to create compelling promotions for GOSH Perfume.** 🎉
