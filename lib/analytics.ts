/**
 * Google Tag Manager (GTM) Integration
 * 
 * This module provides type-safe analytics tracking for the GOSH Perfume Studio application.
 * It includes page views, events, e-commerce tracking, and custom dimensions.
 * 
 * GTM Container ID: GTM-KCXSBFNV
 */

// Extend Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Check if Google Tag Manager is loaded and available
 */
export const isAnalyticsAvailable = (): boolean => {
  return typeof window !== 'undefined' && Array.isArray(window.dataLayer);
};

/**
 * Push event to GTM dataLayer
 */
const pushToDataLayer = (data: Record<string, unknown>): void => {
  if (!isAnalyticsAvailable()) {
    return;
  }

  window.dataLayer?.push(data);
};

/**
 * Track page views
 * Automatically called on route changes
 */
export const trackPageView = (url: string): void => {
  pushToDataLayer({
    event: 'pageview',
    page: url,
  });
};

/**
 * Track custom events
 * 
 * @param eventName - Name of the event (e.g., 'add_to_cart', 'purchase')
 * @param eventParams - Additional parameters for the event
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>
): void => {
  pushToDataLayer({
    event: eventName,
    ...eventParams,
  });
};

/**
 * E-commerce Event Types
 */

interface Product {
  item_id: string | number;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  price: number;
  quantity?: number;
  item_variant?: string;
}

/**
 * Track when a user views a product
 */
export const trackViewItem = (product: Product): void => {
  trackEvent('view_item', {
    currency: 'MMK',
    value: product.price,
    items: [
      {
        item_id: product.item_id,
        item_name: product.item_name,
        item_brand: product.item_brand || 'GOSH PERFUME',
        item_category: product.item_category,
        price: product.price,
        quantity: 1,
      },
    ],
  });
};

/**
 * Track when a user views a list of products
 */
export const trackViewItemList = (
  products: Product[],
  listName: string = 'Product Catalog'
): void => {
  trackEvent('view_item_list', {
    item_list_name: listName,
    items: products.map((product, index) => ({
      item_id: product.item_id,
      item_name: product.item_name,
      item_brand: product.item_brand || 'GOSH PERFUME',
      item_category: product.item_category,
      price: product.price,
      index,
    })),
  });
};

/**
 * Track when a user adds a product to cart
 */
export const trackAddToCart = (product: Product): void => {
  trackEvent('add_to_cart', {
    currency: 'MMK',
    value: product.price * (product.quantity || 1),
    items: [
      {
        item_id: product.item_id,
        item_name: product.item_name,
        item_brand: product.item_brand || 'GOSH PERFUME',
        item_category: product.item_category,
        price: product.price,
        quantity: product.quantity || 1,
        item_variant: product.item_variant,
      },
    ],
  });
};

/**
 * Track when a user removes a product from cart
 */
export const trackRemoveFromCart = (product: Product): void => {
  trackEvent('remove_from_cart', {
    currency: 'MMK',
    value: product.price * (product.quantity || 1),
    items: [
      {
        item_id: product.item_id,
        item_name: product.item_name,
        item_brand: product.item_brand || 'GOSH PERFUME',
        item_category: product.item_category,
        price: product.price,
        quantity: product.quantity || 1,
        item_variant: product.item_variant,
      },
    ],
  });
};

/**
 * Track when a user views their cart
 */
export const trackViewCart = (products: Product[], totalValue: number): void => {
  trackEvent('view_cart', {
    currency: 'MMK',
    value: totalValue,
    items: products.map((product) => ({
      item_id: product.item_id,
      item_name: product.item_name,
      item_brand: product.item_brand || 'GOSH PERFUME',
      item_category: product.item_category,
      price: product.price,
      quantity: product.quantity || 1,
      item_variant: product.item_variant,
    })),
  });
};

/**
 * Track when a user begins checkout
 */
export const trackBeginCheckout = (products: Product[], totalValue: number): void => {
  trackEvent('begin_checkout', {
    currency: 'MMK',
    value: totalValue,
    items: products.map((product) => ({
      item_id: product.item_id,
      item_name: product.item_name,
      item_brand: product.item_brand || 'GOSH PERFUME',
      item_category: product.item_category,
      price: product.price,
      quantity: product.quantity || 1,
      item_variant: product.item_variant,
    })),
  });
};

/**
 * Track when a user adds payment information
 */
export const trackAddPaymentInfo = (
  products: Product[],
  totalValue: number,
  paymentType: string
): void => {
  trackEvent('add_payment_info', {
    currency: 'MMK',
    value: totalValue,
    payment_type: paymentType,
    items: products.map((product) => ({
      item_id: product.item_id,
      item_name: product.item_name,
      item_brand: product.item_brand || 'GOSH PERFUME',
      item_category: product.item_category,
      price: product.price,
      quantity: product.quantity || 1,
      item_variant: product.item_variant,
    })),
  });
};

/**
 * Track when a purchase is completed
 */
export const trackPurchase = (
  transactionId: string,
  products: Product[],
  totalValue: number,
  paymentType: string
): void => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'MMK',
    value: totalValue,
    payment_type: paymentType,
    items: products.map((product) => ({
      item_id: product.item_id,
      item_name: product.item_name,
      item_brand: product.item_brand || 'GOSH PERFUME',
      item_category: product.item_category,
      price: product.price,
      quantity: product.quantity || 1,
      item_variant: product.item_variant,
    })),
  });
};

/**
 * Custom Event Tracking
 */

/**
 * Track newsletter signup
 */
export const trackNewsletterSignup = (email: string): void => {
  trackEvent('newsletter_signup', {
    method: 'website_form',
    email_domain: email.split('@')[1] || 'unknown',
  });
};

/**
 * Track contact form submission
 */
export const trackContactFormSubmit = (subject: string): void => {
  trackEvent('contact_form_submit', {
    form_subject: subject,
  });
};

/**
 * Track search queries
 */
export const trackSearch = (searchTerm: string, resultsCount: number): void => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

/**
 * Track product filter usage
 */
export const trackProductFilter = (filterType: string, filterValue: string): void => {
  trackEvent('product_filter', {
    filter_type: filterType,
    filter_value: filterValue,
  });
};

/**
 * Track when user views product details (quick view)
 */
export const trackQuickView = (productId: string | number, productName: string): void => {
  trackEvent('quick_view', {
    product_id: productId,
    product_name: productName,
  });
};

/**
 * Track user authentication events
 */
export const trackLogin = (method: string = 'email'): void => {
  trackEvent('login', {
    method,
  });
};

export const trackSignup = (method: string = 'email'): void => {
  trackEvent('sign_up', {
    method,
  });
};

/**
 * Track social sharing
 */
export const trackShare = (
  contentType: string,
  itemId: string,
  method: string
): void => {
  trackEvent('share', {
    content_type: contentType,
    item_id: itemId,
    method,
  });
};

/**
 * Track errors and exceptions
 */
export const trackException = (
  description: string,
  fatal: boolean = false
): void => {
  trackEvent('exception', {
    description,
    fatal,
  });
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, unknown>): void => {
  pushToDataLayer({
    event: 'set_user_properties',
    user_properties: properties,
  });
};

/**
 * Track timing events (performance monitoring)
 */
export const trackTiming = (
  name: string,
  value: number,
  category?: string,
  label?: string
): void => {
  trackEvent('timing_complete', {
    name,
    value,
    event_category: category,
    event_label: label,
  });
};
