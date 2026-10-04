/**
 * Product Card with Promotion Support
 * 
 * Reusable product card that automatically displays promotional pricing
 * when a product has an active promotion.
 * 
 * Usage:
 * ```tsx
 * <ProductCardWithPromotion
 *   product={product}
 *   promotion={promotion} // Optional - from useProductPromotions hook
 *   onAddToBag={handleAddToBag}
 *   onQuickView={handleQuickView}
 * />
 * ```
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingBag, Eye, Tag } from "lucide-react";
import StudioSelect from "@/components/ui/StudioSelect";
import { enrichProductWithPromotion, formatPrice, formatDiscountBadge } from "@/lib/promotions";

interface ProductPromotion {
  id: string;
  product_id: string;
  promotion_price: number;
  is_active: boolean;
  start_at: string;
  end_at: string;
}

interface BaseProduct {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  badge: string | null;
  category?: string;
  is_active?: boolean;
  selectedSize?: string;
  decants?: { label: string; price: number }[];
}

interface ProductCardWithPromotionProps<T extends BaseProduct> {
  product: T;
  promotion?: ProductPromotion | null;
  onAddToBag: (product: T & { display_price?: number }) => void;
  onQuickView?: (product: T & { promotion_price?: number }) => void;
  priority?: boolean;
  className?: string;
}

const normalizeImageUrl = (url?: string | null): string => {
  if (!url || url.trim() === "") return "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return u;
  if (u.startsWith("photo-")) return `https://images.unsplash.com/${u}`;
  return "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
};

// Portal-based Decant Dropdown Component
interface DecantDropdownProps {
  product: BaseProduct;
  selectedDecant: { label: string; price: number } | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (decant: { label: string; price: number }) => void;
  promotionPrice?: number;
}

function DecantDropdown({ product, selectedDecant, isOpen, onToggle, onClose, onSelect, promotionPrice }: DecantDropdownProps) {
  const getDecantPromotionPrice = (decantPrice: number): number => {
    if (!promotionPrice) return decantPrice;
    const discountRatio = promotionPrice / product.price;
    return Math.round(decantPrice * discountRatio);
  };
  return <StudioSelect className="mt-3" value={selectedDecant?.label ?? ""} placeholder="Select decant size"
    ariaLabel={"Decant size for " + product.name} open={isOpen} onOpenChange={next => { if (next !== isOpen) { if (next) onToggle(); else onClose(); } }}
    options={[{ value: "", label: "Select decant size" }, ...(product.decants ?? []).slice(0, 4).map(decant => ({ value: decant.label, label: decant.label + " · " + formatPrice(getDecantPromotionPrice(decant.price)), icon: promotionPrice ? <span className="text-[10px] text-muted line-through">{formatPrice(decant.price)}</span> : undefined }))]}
    onChange={value => { if (!value) { onSelect({ label: "", price: 0 }); return; } const decant = product.decants?.find(option => option.label === value); if (decant) onSelect({ ...decant, price: getDecantPromotionPrice(decant.price) }); }} />;
}

export default function ProductCardWithPromotion<T extends BaseProduct>({
  product,
  promotion,
  onAddToBag,
  onQuickView,
  priority = false,
  className = "",
}: ProductCardWithPromotionProps<T>) {
  const enrichedProduct = enrichProductWithPromotion(product, promotion || null);
  const productImageUrl = normalizeImageUrl(product.image);
  const [imageSrc, setImageSrc] = useState(productImageUrl);
  const [selectedDecant, setSelectedDecant] = useState<{ label: string; price: number } | undefined>(undefined);
  const [isDecantOpen, setIsDecantOpen] = useState(false);

  const isAccessory = product.category === "Accessories";
  const hasDecants = Array.isArray(product.decants) && product.decants.length > 0;

  useEffect(() => {
    setImageSrc(productImageUrl);
  }, [productImageUrl]);

  const handleAddToBag = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // For accessories, add directly without decant selection
    if (isAccessory) {
      onAddToBag({
        ...product,
        selectedSize: "Accessory",
        price: enrichedProduct.display_price,
        display_price: enrichedProduct.display_price,
      });
      return;
    }
    
    // If product has decants, use selected decant or full size
    if (hasDecants) {
      onAddToBag({
        ...product,
        selectedSize: selectedDecant?.label || "Full Size",
        price: selectedDecant?.price || enrichedProduct.display_price,
        display_price: selectedDecant?.price || enrichedProduct.display_price,
      });
      return;
    }
    
    // For products without decants, add directly
    onAddToBag({
      ...product,
      selectedSize: "",
      price: enrichedProduct.display_price,
      display_price: enrichedProduct.display_price,
    });
  };

  const handleQuickView = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  return (
    <div className={`group relative h-full min-w-0 ${className}`}>
      <div className="studio-product-card group flex h-full min-h-[370px] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel transition-all duration-300 hover:-translate-y-1 hover:border-line hover:shadow-panel sm:rounded-xl">
        
        {/* Glow effect */}
        <div className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-br from-brand/0 via-accent-soft/0 to-brand/20 opacity-0 hidden transition-opacity duration-500 group-hover:opacity-100 sm:rounded-xl" />
        
        {/* Image Container */}
        <div className="studio-product-image relative z-0 h-[185px] w-full min-w-0 shrink-0 overflow-hidden bg-surface-muted sm:h-[205px]">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            loading={priority ? undefined : "lazy"}
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            unoptimized={imageSrc.includes("ik.imagekit.io")}
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            onError={() => {
              setImageSrc("https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop");
            }}
          />
          
          {/* Badges */}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {/* Promotion Badge - Most Prominent */}
            {enrichedProduct.has_promotion && enrichedProduct.promotion && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 shadow-soft">
                <Tag className="h-3.5 w-3.5 text-on-brand" />
                <span className="text-xs font-semibold uppercase tracking-wider text-on-brand">
                  {formatDiscountBadge(enrichedProduct.promotion.discount_percent)}
                </span>
              </div>
            )}
            
            {/* Product Badge - Only show when NO active promotion */}
            {!enrichedProduct.has_promotion && product.badge && (
              <div className="rounded-full border border-line bg-surface/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink shadow-soft">
                {product.badge}
              </div>
            )}
          </div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Content */}
        <div className="studio-product-content flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          {/* Brand */}
          <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            {product.brand || product.category || "GOSH PERFUME"}
          </p>
          
          {/* Product Name */}
          <h3 className="mt-1.5 line-clamp-2 min-h-[38px] text-base font-semibold leading-tight text-ink sm:min-h-[40px] sm:text-lg">
            {product.name}
          </h3>
          
          {/* Description */}
          <p className="mt-1.5 line-clamp-2 min-h-[36px] text-xs leading-[18px] text-muted sm:line-clamp-1 sm:min-h-[20px] sm:leading-5 sm:text-sm">
            {product.description || "Premium luxury perfume crafted for an elegant everyday scent."}
          </p>
          
          {/* Decant Dropdown - Only for non-accessories with decants */}
          {!isAccessory && hasDecants && (
            <DecantDropdown
              product={product}
              selectedDecant={selectedDecant}
              isOpen={isDecantOpen}
              onToggle={() => setIsDecantOpen(!isDecantOpen)}
              onClose={() => setIsDecantOpen(false)}
              onSelect={(decant) => setSelectedDecant(decant)}
              promotionPrice={enrichedProduct.has_promotion ? enrichedProduct.display_price : undefined}
            />
          )}
          
          {/* Spacer for accessories or products without decants to maintain card height */}
          {(isAccessory || !hasDecants) && (
            <div className="mt-2 min-h-[18px] sm:mt-3 sm:min-h-[24px]" />
          )}
          
          {/* Price and Buttons */}
          <div className="mt-auto space-y-2 pt-2 sm:pt-2.5">
            <div className="flex min-w-0 flex-col gap-2.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
              <div className="flex flex-col gap-1">
                {/* Show original price if on promotion */}
                {enrichedProduct.has_promotion && (
                  <span className="text-sm font-bold text-muted line-through">
                    {formatPrice(
                      isAccessory || !hasDecants 
                        ? product.price 
                        : (selectedDecant?.price ? selectedDecant.price / (enrichedProduct.display_price / product.price) : product.price)
                    )}
                  </span>
                )}
                <span className={`shrink-0 text-xl font-semibold sm:text-2xl ${
                  enrichedProduct.has_promotion ? 'text-destructive' : 'text-accent'
                }`}>
                  {formatPrice(
                    isAccessory || !hasDecants 
                      ? enrichedProduct.display_price 
                      : (selectedDecant?.price || enrichedProduct.display_price)
                  )}
                </span>
              </div>
              
              {onQuickView && (
                <button 
                  type="button"
                  onClick={handleQuickView}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink transition-all duration-300 hover:border-line hover:bg-surface focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
                  aria-label={`Quick view ${product.name}`}
                  data-studio-tooltip={`Quick view ${product.name}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            
            <button 
              type="button"
              onClick={handleAddToBag}
              aria-label={`Add ${product.name} to bag`}
              className="studio-button studio-button--primary inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Add to Bag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
