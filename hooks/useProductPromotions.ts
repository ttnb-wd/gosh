import { useState, useEffect } from "react";
import { enrichProductWithPromotion, enrichProductsWithPromotions, type EnrichedProduct } from "@/lib/promotions";

interface ProductPromotionData {
  id: string;
  product_id: string;
  promotion_price: number;
  is_active: boolean;
  start_at: string;
  end_at: string;
}

/**
 * Hook to fetch and manage product promotions on the client side
 * Returns a map of product ID to promotion data for efficient lookups
 */
export function useProductPromotions() {
  const [promotionsMap, setPromotionsMap] = useState<Map<string, ProductPromotionData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPromotions() {
      try {
        setLoading(true);
        const response = await fetch("/api/product-promotions/active");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch promotions: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && Array.isArray(result.promotions)) {
          const map = new Map<string, ProductPromotionData>();
          
          result.promotions.forEach((promo: any) => {
            map.set(promo.product_id, {
              id: promo.id,
              product_id: promo.product_id,
              promotion_price: promo.promotion_price,
              is_active: promo.is_active,
              start_at: promo.start_at,
              end_at: promo.end_at,
            });
          });
          
          setPromotionsMap(map);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        console.error("[useProductPromotions] Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPromotions();
  }, []);

  /**
   * Enrich a single product with its promotion
   */
  const enrichProduct = <T extends { id: string | number; price: number; [key: string]: any }>(
    product: T
  ): EnrichedProduct & Omit<T, keyof EnrichedProduct> => {
    const promotion = promotionsMap.get(String(product.id));
    return enrichProductWithPromotion(product, promotion || null);
  };

  /**
   * Enrich multiple products with their promotions
   */
  const enrichProducts = <T extends { id: string | number; price: number; [key: string]: any }>(
    products: T[]
  ): Array<EnrichedProduct & Omit<T, keyof EnrichedProduct>> => {
    const promotionsArray = Array.from(promotionsMap.values());
    return enrichProductsWithPromotions(products, promotionsArray);
  };

  /**
   * Get promotion for a specific product
   */
  const getPromotion = (productId: string | number): ProductPromotionData | null => {
    return promotionsMap.get(String(productId)) || null;
  };

  /**
   * Check if a product has an active promotion
   */
  const hasPromotion = (productId: string | number): boolean => {
    return promotionsMap.has(String(productId));
  };

  return {
    promotionsMap,
    loading,
    error,
    enrichProduct,
    enrichProducts,
    getPromotion,
    hasPromotion,
  };
}
