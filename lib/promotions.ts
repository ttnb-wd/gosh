/**
 * Centralized Promotion Service
 * 
 * Single source of truth for all promotion-related logic across the application.
 * Handles both generic promotions (banners) and product promotions (pricing).
 */

// Support both Firebase Admin and Client SDK Timestamp types
type FirebaseTimestamp = {
  toDate(): Date;
  toMillis(): number;
};

// ============================================================================
// TYPES
// ============================================================================

export interface ProductPromotionInfo {
  id: string;
  product_id: string;
  promotion_price: number;
  original_price: number;
  discount_percent: number;
  discount_amount: number;
  is_active: boolean;
  start_at: Date | string;
  end_at: Date | string;
}

export interface EnrichedProduct {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  badge: string | null;
  category?: string;
  is_active?: boolean;
  // Promotion fields - only present if product has active promotion
  promotion?: ProductPromotionInfo;
  // Display price - either promotion_price or regular price
  display_price: number;
  // Whether to show promotion UI
  has_promotion: boolean;
}

// ============================================================================
// PROMOTION STATUS
// ============================================================================

/**
 * Check if a promotion is currently active based on dates
 */
export function isPromotionActive(
  startAt: Date | string | FirebaseTimestamp,
  endAt: Date | string | FirebaseTimestamp,
  isActive: boolean = true
): boolean {
  if (!isActive) return false;

  const now = new Date();
  
  // Convert to Date objects
  const startDate = (startAt as any)?.toDate
    ? (startAt as FirebaseTimestamp).toDate() 
    : typeof startAt === 'string'
    ? new Date(startAt)
    : startAt as Date;
    
  const endDate = (endAt as any)?.toDate
    ? (endAt as FirebaseTimestamp).toDate() 
    : typeof endAt === 'string'
    ? new Date(endAt)
    : endAt as Date;

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('[isPromotionActive] Invalid dates:', { startAt, endAt });
    return false;
  }

  return now >= startDate && now <= endDate;
}

// ============================================================================
// PRICE CALCULATION
// ============================================================================

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercent(
  originalPrice: number,
  promotionPrice: number
): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - promotionPrice) / originalPrice) * 100);
}

/**
 * Calculate discount amount
 */
export function calculateDiscountAmount(
  originalPrice: number,
  promotionPrice: number
): number {
  return Math.max(0, originalPrice - promotionPrice);
}

// ============================================================================
// PRODUCT ENRICHMENT
// ============================================================================

/**
 * Enrich a single product with promotion data
 * This is the centralized logic used everywhere in the app
 */
export function enrichProductWithPromotion<T extends {
  id: string | number;
  price: number;
  [key: string]: any;
}>(
  product: T,
  promotion: {
    id: string;
    promotion_price: number;
    is_active: boolean;
    start_at: Date | string | FirebaseTimestamp;
    end_at: Date | string | FirebaseTimestamp;
  } | null
): EnrichedProduct & Omit<T, keyof EnrichedProduct> {
  const hasActivePromotion = promotion && isPromotionActive(
    promotion.start_at,
    promotion.end_at,
    promotion.is_active
  );

  const displayPrice = hasActivePromotion 
    ? promotion.promotion_price 
    : product.price;

  const result: any = {
    ...product,
    display_price: displayPrice,
    has_promotion: !!hasActivePromotion,
  };

  if (hasActivePromotion) {
    const startDate = (promotion.start_at as any)?.toDate
      ? (promotion.start_at as FirebaseTimestamp).toDate() 
      : typeof promotion.start_at === 'string'
      ? new Date(promotion.start_at)
      : promotion.start_at as Date;
      
    const endDate = (promotion.end_at as any)?.toDate
      ? (promotion.end_at as FirebaseTimestamp).toDate() 
      : typeof promotion.end_at === 'string'
      ? new Date(promotion.end_at)
      : promotion.end_at as Date;

    result.promotion = {
      id: promotion.id,
      product_id: String(product.id),
      promotion_price: promotion.promotion_price,
      original_price: product.price,
      discount_percent: calculateDiscountPercent(product.price, promotion.promotion_price),
      discount_amount: calculateDiscountAmount(product.price, promotion.promotion_price),
      is_active: promotion.is_active,
      start_at: startDate,
      end_at: endDate,
    };
  }

  return result as EnrichedProduct & Omit<T, keyof EnrichedProduct>;
}

/**
 * Enrich multiple products with their promotions
 * Efficiently batch-processes products with a promotion lookup map
 */
export function enrichProductsWithPromotions<T extends {
  id: string | number;
  price: number;
  [key: string]: any;
}>(
  products: T[],
  promotions: Array<{
    id: string;
    product_id: string;
    promotion_price: number;
    is_active: boolean;
    start_at: Date | string | FirebaseTimestamp;
    end_at: Date | string | FirebaseTimestamp;
  }>
): Array<EnrichedProduct & Omit<T, keyof EnrichedProduct>> {
  // Create lookup map for O(1) access
  const promotionMap = new Map(
    promotions.map(promo => [String(promo.product_id), promo])
  );

  return products.map(product => {
    const promotion = promotionMap.get(String(product.id));
    return enrichProductWithPromotion(product, promotion || null);
  });
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format price in MMK
 */
export function formatPrice(price: number): string {
  return `${Math.round(price || 0).toLocaleString()} MMK`;
}

/**
 * Format discount badge text
 */
export function formatDiscountBadge(discountPercent: number): string {
  return `${discountPercent}% OFF`;
}
