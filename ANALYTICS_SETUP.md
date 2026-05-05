# Google Analytics 4 (GA4) Setup Guide

## Overview

This application includes a complete Google Analytics 4 (GA4) integration for tracking user behavior, e-commerce events, and custom interactions. The implementation is production-ready and follows best practices for privacy and performance.

## Features

✅ **Automatic Page View Tracking** - Tracks all page navigations  
✅ **E-commerce Tracking** - Complete purchase funnel tracking  
✅ **Custom Event Tracking** - Newsletter signups, contact forms, searches  
✅ **Product Analytics** - View items, add to cart, remove from cart  
✅ **User Authentication Tracking** - Login and signup events  
✅ **Performance Monitoring** - Custom timing events  
✅ **Privacy Compliant** - IP anonymization and cookie consent ready  

---

## Setup Instructions

### Step 1: Create a Google Analytics 4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Click **Admin** (gear icon in bottom left)
3. Under **Property**, click **Create Property**
4. Fill in your property details:
   - **Property name**: GOSH Perfume Studio
   - **Reporting time zone**: Your timezone
   - **Currency**: Myanmar Kyat (MMK)
5. Click **Next** and complete the setup wizard
6. After creation, go to **Admin** → **Data Streams**
7. Click **Add stream** → **Web**
8. Enter your website URL: `https://goshperfume.com`
9. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Add Measurement ID to Environment Variables

Add the following line to your `.env` file:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Measurement ID from Step 1.

### Step 3: Verify Installation

1. Start your development server: `npm run dev`
2. Open your website in a browser
3. Open Google Analytics → **Reports** → **Realtime**
4. You should see your visit appear in real-time
5. Navigate between pages to verify page view tracking

---

## Implementation Details

### Files Added

1. **`lib/analytics.ts`** - Core analytics functions and type definitions
2. **`components/GoogleAnalytics.tsx`** - GA4 script loader and page view tracker
3. **`app/layout.tsx`** - Updated to include GoogleAnalytics component

### Automatic Tracking

The following events are tracked automatically:

- ✅ **Page Views** - Every route change
- ✅ **Session Duration** - Automatic by GA4
- ✅ **User Demographics** - Automatic by GA4 (if enabled)
- ✅ **Device Information** - Browser, OS, screen size

### Manual Event Tracking

To track custom events in your components, import and use the analytics functions:

```typescript
import { 
  trackAddToCart, 
  trackPurchase, 
  trackNewsletterSignup 
} from '@/lib/analytics';

// Track when user adds product to cart
trackAddToCart({
  item_id: product.id,
  item_name: product.name,
  item_brand: product.brand,
  item_category: product.category,
  price: product.price,
  quantity: 1,
  item_variant: product.selectedSize
});

// Track completed purchase
trackPurchase(
  orderNumber,
  cartItems,
  totalAmount,
  paymentMethod
);

// Track newsletter signup
trackNewsletterSignup(email);
```

---

## E-commerce Tracking

### Purchase Funnel Events

The following e-commerce events are available:

1. **`trackViewItemList`** - User views product catalog
2. **`trackViewItem`** - User views product details
3. **`trackAddToCart`** - User adds product to cart
4. **`trackRemoveFromCart`** - User removes product from cart
5. **`trackViewCart`** - User opens cart drawer
6. **`trackBeginCheckout`** - User starts checkout process
7. **`trackAddPaymentInfo`** - User selects payment method
8. **`trackPurchase`** - Order completed successfully

### Example: Complete Purchase Flow

```typescript
// 1. User views products page
trackViewItemList(products, 'Product Catalog');

// 2. User clicks on a product
trackViewItem({
  item_id: product.id,
  item_name: product.name,
  price: product.price
});

// 3. User adds to cart
trackAddToCart({
  item_id: product.id,
  item_name: product.name,
  price: product.price,
  quantity: 1
});

// 4. User opens cart
trackViewCart(cartItems, cartTotal);

// 5. User goes to checkout
trackBeginCheckout(cartItems, cartTotal);

// 6. User selects payment method
trackAddPaymentInfo(cartItems, cartTotal, 'kbzpay');

// 7. Order completed
trackPurchase(orderNumber, cartItems, cartTotal, 'kbzpay');
```

---

## Custom Events

### Newsletter Signup

```typescript
import { trackNewsletterSignup } from '@/lib/analytics';

trackNewsletterSignup(email);
```

### Contact Form Submission

```typescript
import { trackContactFormSubmit } from '@/lib/analytics';

trackContactFormSubmit(subject);
```

### Product Search

```typescript
import { trackSearch } from '@/lib/analytics';

trackSearch(searchQuery, resultsCount);
```

### Product Filtering

```typescript
import { trackProductFilter } from '@/lib/analytics';

trackProductFilter('brand', 'Dior');
trackProductFilter('category', 'Floral');
```

### Quick View Modal

```typescript
import { trackQuickView } from '@/lib/analytics';

trackQuickView(product.id, product.name);
```

### User Authentication

```typescript
import { trackLogin, trackSignup } from '@/lib/analytics';

// After successful login
trackLogin('email');

// After successful signup
trackSignup('email');
```

---

## Recommended Implementation Points

### 1. Product Pages (`app/products/page.tsx`)

```typescript
import { trackViewItemList, trackAddToCart } from '@/lib/analytics';

// When products load
useEffect(() => {
  if (products.length > 0) {
    trackViewItemList(
      products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_brand: p.brand,
        price: p.price
      })),
      'Product Catalog'
    );
  }
}, [products]);

// When user adds to cart
const handleAddToCart = (product) => {
  trackAddToCart({
    item_id: product.id,
    item_name: product.name,
    item_brand: product.brand,
    price: product.price,
    quantity: 1,
    item_variant: product.selectedSize
  });
  
  // ... rest of add to cart logic
};
```

### 2. Cart Drawer (`components/CartDrawer.tsx`)

```typescript
import { trackViewCart, trackRemoveFromCart } from '@/lib/analytics';

// When cart opens
useEffect(() => {
  if (isOpen && cartItems.length > 0) {
    const total = cartItems.reduce((sum, item) => 
      sum + (item.price * item.qty), 0
    );
    
    trackViewCart(
      cartItems.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_brand: item.brand,
        price: item.price,
        quantity: item.qty,
        item_variant: item.selectedSize
      })),
      total
    );
  }
}, [isOpen, cartItems]);

// When user removes item
const handleRemove = (item) => {
  trackRemoveFromCart({
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.qty
  });
  
  // ... rest of remove logic
};
```

### 3. Checkout Page (`app/checkout/page.tsx`)

```typescript
import { 
  trackBeginCheckout, 
  trackAddPaymentInfo, 
  trackPurchase 
} from '@/lib/analytics';

// When checkout page loads
useEffect(() => {
  if (cartItems.length > 0) {
    trackBeginCheckout(
      cartItems.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.qty
      })),
      subtotal
    );
  }
}, []);

// When payment method selected
const handlePaymentSelect = (method) => {
  trackAddPaymentInfo(
    cartItems.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.qty
    })),
    subtotal,
    method
  );
  
  setSelectedPayment(method);
};

// After successful order
const handleOrderSuccess = (order) => {
  trackPurchase(
    order.order_number,
    cartItems.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.qty
    })),
    order.total,
    order.payment_method
  );
};
```

### 4. Newsletter (`components/Newsletter.tsx`)

```typescript
import { trackNewsletterSignup } from '@/lib/analytics';

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ... newsletter signup logic
  
  if (success) {
    trackNewsletterSignup(email);
  }
};
```

### 5. Contact Form (`components/ContactSection.tsx`)

```typescript
import { trackContactFormSubmit } from '@/lib/analytics';

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ... contact form logic
  
  if (success) {
    trackContactFormSubmit(formData.subject);
  }
};
```

### 6. Login/Signup (`app/login/page.tsx`)

```typescript
import { trackLogin, trackSignup } from '@/lib/analytics';

// After successful login
if (mode === 'login' && !signInError) {
  trackLogin('email');
}

// After successful signup
if (mode === 'signup' && !error) {
  trackSignup('email');
}
```

---

## Privacy & Compliance

### GDPR Compliance

The implementation includes:

- ✅ **IP Anonymization** - Enabled by default
- ✅ **Cookie Consent Ready** - Can be integrated with cookie consent banner
- ✅ **Data Retention** - Configure in GA4 settings (default: 14 months)

### Cookie Consent Integration

If you need to add cookie consent (required for EU visitors):

```typescript
// Only load analytics after user consent
import { useEffect, useState } from 'react';

export default function GoogleAnalytics() {
  const [consent, setConsent] = useState(false);
  
  useEffect(() => {
    // Check if user has given consent
    const hasConsent = localStorage.getItem('analytics_consent') === 'true';
    setConsent(hasConsent);
  }, []);
  
  if (!consent) {
    return null;
  }
  
  // ... rest of component
}
```

### Data to Track

**Recommended to track:**
- Page views
- Product views
- Add to cart
- Purchases
- Newsletter signups
- Contact form submissions

**Avoid tracking:**
- Personal information (names, emails, phone numbers)
- Payment details
- Passwords
- Sensitive user data

---

## Google Analytics Dashboard Setup

### Recommended Reports to Create

1. **E-commerce Overview**
   - Total revenue
   - Transactions
   - Average order value
   - Conversion rate

2. **Product Performance**
   - Most viewed products
   - Most added to cart
   - Most purchased products
   - Cart abandonment rate

3. **User Behavior**
   - Top pages
   - User flow
   - Exit pages
   - Session duration

4. **Acquisition**
   - Traffic sources
   - Campaign performance
   - Social media referrals

### Setting Up E-commerce Reports

1. Go to **Admin** → **Data display** → **E-commerce Settings**
2. Enable **E-commerce**
3. Enable **Enhanced Measurement**
4. Go to **Reports** → **Monetization** → **E-commerce purchases**

---

## Testing

### Development Testing

```bash
# Start development server
npm run dev

# Open browser console
# Type: window.gtag
# Should show: function gtag(){...}

# Type: window.dataLayer
# Should show: Array with events
```

### Production Testing

1. Deploy to production
2. Visit your website
3. Open Google Analytics → **Realtime**
4. Perform actions (view products, add to cart, etc.)
5. Verify events appear in real-time

### Debug Mode

To enable GA4 debug mode in development:

```typescript
// In components/GoogleAnalytics.tsx
gtag('config', '${measurementId}', {
  debug_mode: true, // Add this line
  page_path: window.location.pathname,
  // ... rest of config
});
```

Then open Chrome DevTools → Console to see debug messages.

---

## Troubleshooting

### Analytics Not Loading

**Problem**: No data in Google Analytics  
**Solutions**:
1. Verify `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set in `.env`
2. Check browser console for errors
3. Verify Measurement ID format: `G-XXXXXXXXXX`
4. Check if ad blockers are enabled (disable for testing)
5. Wait 24-48 hours for data to appear in standard reports (use Realtime for immediate feedback)

### Events Not Tracking

**Problem**: Custom events not appearing  
**Solutions**:
1. Check browser console: `window.dataLayer`
2. Verify event names match GA4 conventions (lowercase, underscores)
3. Check if analytics is loaded: `window.gtag`
4. Use GA4 DebugView for real-time event debugging

### Multiple Page Views

**Problem**: Duplicate page views  
**Solutions**:
1. Ensure `GoogleAnalytics` component is only included once (in root layout)
2. Check for multiple GA4 scripts
3. Verify `useEffect` dependencies in page tracking

---

## Performance Considerations

- ✅ **Lazy Loading** - GA4 script loads after page interactive
- ✅ **Minimal Bundle Size** - Analytics code is tree-shakeable
- ✅ **No Blocking** - Scripts use `strategy="afterInteractive"`
- ✅ **Efficient Tracking** - Events are batched by GA4

---

## Support & Resources

- [GA4 Documentation](https://support.google.com/analytics/answer/10089681)
- [GA4 E-commerce Events](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Next.js Analytics Guide](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)

---

## Next Steps

1. ✅ Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to `.env`
2. ✅ Deploy to production
3. ✅ Verify tracking in GA4 Realtime
4. ✅ Implement event tracking in key components (see Recommended Implementation Points)
5. ✅ Set up custom reports in GA4
6. ✅ Configure conversion goals
7. ✅ Add cookie consent banner (if required for your region)
8. ✅ Monitor and optimize based on data

---

**Last Updated**: May 5, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
