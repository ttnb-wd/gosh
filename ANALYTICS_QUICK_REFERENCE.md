# Analytics Quick Reference

## Setup (One-Time)

```bash
# 1. Add to .env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# 2. Restart dev server
npm run dev
```

## Common Tracking Examples

### Product Viewed

```typescript
import { trackViewItem } from '@/lib/analytics';

trackViewItem({
  item_id: product.id,
  item_name: product.name,
  item_brand: product.brand,
  price: product.price
});
```

### Add to Cart

```typescript
import { trackAddToCart } from '@/lib/analytics';

trackAddToCart({
  item_id: product.id,
  item_name: product.name,
  price: product.price,
  quantity: 1,
  item_variant: product.selectedSize
});
```

### Purchase Completed

```typescript
import { trackPurchase } from '@/lib/analytics';

trackPurchase(
  orderNumber,      // "ORD-12345"
  cartItems,        // Array of products
  totalAmount,      // 50000
  paymentMethod     // "kbzpay"
);
```

### Newsletter Signup

```typescript
import { trackNewsletterSignup } from '@/lib/analytics';

trackNewsletterSignup(email);
```

### Contact Form

```typescript
import { trackContactFormSubmit } from '@/lib/analytics';

trackContactFormSubmit(subject);
```

### User Login

```typescript
import { trackLogin } from '@/lib/analytics';

trackLogin('email');
```

## All Available Functions

```typescript
// E-commerce
trackViewItemList(products, listName)
trackViewItem(product)
trackAddToCart(product)
trackRemoveFromCart(product)
trackViewCart(products, totalValue)
trackBeginCheckout(products, totalValue)
trackAddPaymentInfo(products, totalValue, paymentType)
trackPurchase(transactionId, products, totalValue, paymentType)

// Custom Events
trackNewsletterSignup(email)
trackContactFormSubmit(subject)
trackSearch(searchTerm, resultsCount)
trackProductFilter(filterType, filterValue)
trackQuickView(productId, productName)
trackLogin(method)
trackSignup(method)
trackShare(contentType, itemId, method)
trackException(description, fatal)

// Utilities
trackEvent(eventName, eventParams)
trackPageView(url)
setUserProperties(properties)
trackTiming(name, value, category, label)
```

## Product Object Format

```typescript
{
  item_id: string | number,      // Required
  item_name: string,              // Required
  item_brand?: string,            // Optional
  item_category?: string,         // Optional
  price: number,                  // Required
  quantity?: number,              // Optional (default: 1)
  item_variant?: string           // Optional (e.g., "5ml", "10ml")
}
```

## Testing

```javascript
// Browser console
window.gtag              // Should be a function
window.dataLayer         // Should be an array with events

// Check last event
window.dataLayer[window.dataLayer.length - 1]
```

## Verification

1. Open [Google Analytics](https://analytics.google.com)
2. Go to **Reports** → **Realtime**
3. Perform actions on your site
4. See events appear in real-time

## Common Issues

| Issue | Solution |
|-------|----------|
| No data showing | Check `.env` has `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| Events not tracking | Verify `window.gtag` exists in console |
| Duplicate events | Ensure `GoogleAnalytics` component only in root layout |
| Ad blocker | Disable for testing |

## Need More Help?

See full documentation: `ANALYTICS_SETUP.md`
