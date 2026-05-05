# Analytics Activation Checklist

## ✅ Pre-Activation Checklist

### 1. Google Analytics Setup
- [ ] Go to https://analytics.google.com
- [ ] Sign in with Google account
- [ ] Click **Admin** (gear icon, bottom left)
- [ ] Click **Create Property**
- [ ] Fill in property details:
  - Property name: `GOSH Perfume Studio`
  - Time zone: Your timezone
  - Currency: `Myanmar Kyat (MMK)`
- [ ] Complete setup wizard
- [ ] Go to **Admin** → **Data Streams**
- [ ] Click **Add stream** → **Web**
- [ ] Enter URL: `https://goshperfume.com`
- [ ] Copy **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Environment Configuration
- [ ] Open `.env` file in project root
- [ ] Add line: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
- [ ] Replace `G-XXXXXXXXXX` with your actual Measurement ID
- [ ] Save file
- [ ] **Important**: Do NOT commit `.env` to Git

### 3. Deployment
- [ ] Restart development server: `npm run dev`
- [ ] Or deploy to production: `npm run build && npm start`
- [ ] Verify no console errors

### 4. Verification
- [ ] Open website in browser
- [ ] Open browser console (F12)
- [ ] Type: `window.gtag` - Should show function
- [ ] Type: `window.dataLayer` - Should show array
- [ ] Go to Google Analytics → **Reports** → **Realtime**
- [ ] You should see your visit in real-time
- [ ] Navigate between pages
- [ ] Verify page views are tracked

---

## 🎯 Post-Activation Checklist

### 5. Basic Testing
- [ ] Visit homepage - Check Realtime for page view
- [ ] Visit products page - Check Realtime for page view
- [ ] Visit about page - Check Realtime for page view
- [ ] Visit contact page - Check Realtime for page view
- [ ] Check all page views appear in GA4 Realtime

### 6. E-commerce Setup (Optional but Recommended)
- [ ] Go to **Admin** → **Data display** → **E-commerce Settings**
- [ ] Enable **E-commerce**
- [ ] Enable **Enhanced Measurement**
- [ ] Save settings

### 7. Implement Event Tracking (Recommended)
See `ANALYTICS_SETUP.md` for detailed implementation examples.

#### High Priority Events
- [ ] Add to cart tracking in `app/products/page.tsx`
- [ ] Purchase tracking in `app/checkout/page.tsx`
- [ ] Cart view tracking in `components/CartDrawer.tsx`
- [ ] Newsletter signup in `components/Newsletter.tsx`
- [ ] Contact form in `components/ContactSection.tsx`

#### Medium Priority Events
- [ ] Login/signup tracking in `app/login/page.tsx`
- [ ] Product list view in `components/ProductSection.tsx`
- [ ] Quick view tracking in `components/QuickViewModal.tsx`

#### Low Priority Events
- [ ] Product filtering
- [ ] Search tracking
- [ ] Social sharing

### 8. Configure Reports
- [ ] Go to **Reports** → **Monetization** → **E-commerce purchases**
- [ ] Create custom report for product performance
- [ ] Create custom report for user behavior
- [ ] Set up conversion goals

### 9. Set Up Alerts (Optional)
- [ ] Go to **Admin** → **Custom Alerts**
- [ ] Create alert for revenue drops
- [ ] Create alert for traffic spikes
- [ ] Create alert for error increases

### 10. Team Access (Optional)
- [ ] Go to **Admin** → **Property Access Management**
- [ ] Add team members with appropriate roles
- [ ] Send invitation emails

---

## 🔒 Privacy & Compliance Checklist

### 11. Privacy Configuration
- [ ] Verify IP anonymization is enabled (default in implementation)
- [ ] Review data retention settings in GA4
- [ ] Configure cookie consent if required for your region
- [ ] Update privacy policy to mention analytics

### 12. GDPR Compliance (If applicable)
- [ ] Add cookie consent banner (if serving EU users)
- [ ] Update privacy policy
- [ ] Provide opt-out mechanism
- [ ] Document data processing

---

## 📊 Monitoring Checklist

### 13. Daily Monitoring (First Week)
- [ ] Check Realtime reports daily
- [ ] Verify events are tracking correctly
- [ ] Monitor for any errors
- [ ] Check data quality

### 14. Weekly Monitoring (First Month)
- [ ] Review weekly reports
- [ ] Check conversion rates
- [ ] Analyze top products
- [ ] Review traffic sources

### 15. Monthly Monitoring (Ongoing)
- [ ] Review monthly performance
- [ ] Analyze trends
- [ ] Optimize based on data
- [ ] Update tracking as needed

---

## 🐛 Troubleshooting Checklist

### If Analytics Not Working

#### Check Environment Variable
- [ ] Verify `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists in `.env`
- [ ] Verify format is `G-XXXXXXXXXX` (starts with G-)
- [ ] Verify no extra spaces or quotes
- [ ] Restart server after adding variable

#### Check Browser
- [ ] Disable ad blockers
- [ ] Clear browser cache
- [ ] Try incognito/private mode
- [ ] Try different browser

#### Check Console
- [ ] Open browser console (F12)
- [ ] Look for errors
- [ ] Check `window.gtag` exists
- [ ] Check `window.dataLayer` has data

#### Check Google Analytics
- [ ] Verify Measurement ID is correct
- [ ] Check data stream is active
- [ ] Wait 24-48 hours for standard reports
- [ ] Use Realtime for immediate feedback

### If Events Not Tracking

- [ ] Verify event implementation code
- [ ] Check browser console for errors
- [ ] Use GA4 DebugView for real-time debugging
- [ ] Verify event names match GA4 conventions
- [ ] Check if analytics is loaded before event fires

---

## 📚 Documentation Reference

| Issue | See Document | Section |
|-------|--------------|---------|
| Setup instructions | `ANALYTICS_SETUP.md` | Setup Instructions |
| Event tracking | `ANALYTICS_SETUP.md` | Custom Events |
| Implementation examples | `ANALYTICS_SETUP.md` | Recommended Implementation |
| Quick reference | `ANALYTICS_QUICK_REFERENCE.md` | All sections |
| Troubleshooting | `ANALYTICS_SETUP.md` | Troubleshooting |
| Privacy | `ANALYTICS_SETUP.md` | Privacy & Compliance |

---

## ✅ Success Criteria

You'll know analytics is working correctly when:

✅ **Realtime reports show activity** - See visits in GA4 Realtime  
✅ **Page views are tracked** - Each page navigation appears  
✅ **No console errors** - Browser console is clean  
✅ **Data appears in reports** - Standard reports populate (24-48 hours)  
✅ **Events are firing** - Custom events appear in DebugView  

---

## 🎉 Completion

Once all items are checked:

- ✅ Analytics is fully activated
- ✅ Tracking is working correctly
- ✅ Reports are configured
- ✅ Team has access
- ✅ Privacy is compliant
- ✅ Monitoring is in place

**Congratulations!** Your analytics implementation is complete and operational.

---

## 📞 Need Help?

- **Setup Issues**: See `ANALYTICS_SETUP.md` → Troubleshooting
- **Implementation**: See `ANALYTICS_SETUP.md` → Recommended Implementation
- **Quick Examples**: See `ANALYTICS_QUICK_REFERENCE.md`
- **Google Analytics Help**: https://support.google.com/analytics

---

**Last Updated**: May 5, 2026  
**Version**: 1.0.0  
**Estimated Time**: 15-30 minutes for basic setup
