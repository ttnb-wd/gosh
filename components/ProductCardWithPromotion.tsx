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

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ShoppingBag, Eye, Tag } from "lucide-react";
import { createPortal } from "react-dom";
import { enrichProductWithPromotion, formatPrice, formatDiscountBadge, type EnrichedProduct } from "@/lib/promotions";

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
  [key: string]: any;
}

interface ProductCardWithPromotionProps {
  product: BaseProduct;
  promotion?: ProductPromotion | null;
  onAddToBag: (product: any) => void;
  onQuickView?: (product: any) => void;
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
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      onClose();
      return;
    }
    
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const maxLeft = window.innerWidth - width - viewportPadding;
    let top = rect.bottom + 10;
    
    const estimatedMenuHeight = 240;
    if (top + estimatedMenuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - estimatedMenuHeight - 10);
    }
    
    setPosition({
      top,
      left: Math.max(viewportPadding, Math.min(rect.left, maxLeft)),
      width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("orientationchange", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("orientationchange", handleUpdate);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target) && menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const getDecantPromotionPrice = (decantPrice: number): number => {
    if (!promotionPrice) return decantPrice;
    const discountRatio = promotionPrice / product.price;
    return Math.round(decantPrice * discountRatio);
  };

  return (
    <div className="relative z-[1000] mt-3 min-h-[42px] w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updatePosition();
          onToggle();
        }}
        className="flex w-full items-center justify-between rounded-full border border-yellow-300 bg-white/95 px-4 py-2.5 text-left text-sm font-bold text-neutral-900 shadow-[0_12px_30px_rgba(234,179,8,0.14)] transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-50/70 focus:outline-none focus:ring-4 focus:ring-yellow-200/70"
      >
        <span className="truncate">
          {selectedDecant?.label || "Select decant size"}
        </span>
        <span className={`shrink-0 text-yellow-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[999999] max-h-[240px] overflow-y-auto rounded-[24px] border border-yellow-200 bg-white p-3 shadow-[0_24px_70px_rgba(0,0,0,0.22),0_0_30px_rgba(234,179,8,0.14)]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect({ label: "", price: 0 });
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-neutral-500 transition hover:bg-yellow-50 hover:text-yellow-700"
          >
            Select decant size
          </button>
          {(product.decants || []).slice(0, 4).map((decant) => {
            const isSelected = selectedDecant?.label === decant.label;
            const finalPrice = promotionPrice ? getDecantPromotionPrice(decant.price) : decant.price;
            
            return (
              <button
                key={decant.label}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect({ ...decant, price: finalPrice });
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-all duration-200 ${
                  isSelected
                    ? "bg-yellow-400 text-black shadow-[0_8px_22px_rgba(234,179,8,0.28)]"
                    : "text-neutral-800 hover:bg-yellow-50 hover:text-yellow-700"
                }`}
              >
                <span>{decant.label}</span>
                <div className="flex flex-col items-end">
                  {promotionPrice && (
                    <span className="text-[10px] text-gray-500 line-through">
                      {formatPrice(decant.price)}
                    </span>
                  )}
                  <span className={isSelected ? "text-black" : "text-yellow-700"}>
                    {formatPrice(finalPrice)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function ProductCardWithPromotion({
  product,
  promotion,
  onAddToBag,
  onQuickView,
  priority = false,
  className = "",
}: ProductCardWithPromotionProps) {
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
      <div className="group flex h-full min-h-[370px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#d4af37]/20 bg-white shadow-[0_18px_45px_rgba(31,26,20,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/40 hover:shadow-[0_18px_45px_rgba(31,26,20,0.12)] sm:rounded-[28px]">
        
        {/* Glow effect */}
        <div className="pointer-events-none absolute -inset-1 rounded-[26px] bg-gradient-to-br from-[#d4af37]/0 via-[#f7e7b3]/0 to-[#d4af37]/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 sm:rounded-[32px]" />
        
        {/* Image Container */}
        <div className="relative z-0 h-[185px] w-full min-w-0 shrink-0 overflow-hidden bg-gradient-to-br from-[#fff7e6] via-white to-[#f7e7b3] sm:h-[205px]">
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
              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 shadow-lg">
                <Tag className="h-3.5 w-3.5 text-white" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  {formatDiscountBadge(enrichedProduct.promotion.discount_percent)}
                </span>
              </div>
            )}
            
            {/* Product Badge - Only show when NO active promotion */}
            {!enrichedProduct.has_promotion && product.badge && (
              <div className="rounded-full border border-[#d4af37]/40 bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1f1a14] shadow-sm">
                {product.badge}
              </div>
            )}
          </div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          {/* Brand */}
          <p className="min-w-0 truncate text-xs font-black uppercase tracking-[0.18em] text-[#6f1d1b]">
            {product.brand || product.category || "GOSH PERFUME"}
          </p>
          
          {/* Product Name */}
          <h3 className="mt-1.5 line-clamp-2 min-h-[38px] text-base font-black leading-tight text-[#1f1a14] sm:min-h-[40px] sm:text-lg">
            {product.name}
          </h3>
          
          {/* Description */}
          <p className="mt-1.5 line-clamp-2 min-h-[36px] text-xs leading-[18px] text-[#7a6a55] sm:line-clamp-1 sm:min-h-[20px] sm:leading-5 sm:text-sm">
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
                  <span className="text-sm font-bold text-gray-500 line-through">
                    {formatPrice(
                      isAccessory || !hasDecants 
                        ? product.price 
                        : (selectedDecant?.price ? selectedDecant.price / (enrichedProduct.display_price / product.price) : product.price)
                    )}
                  </span>
                )}
                <span className={`shrink-0 text-xl font-black sm:text-2xl ${
                  enrichedProduct.has_promotion ? 'text-red-600' : 'text-[#b88705]'
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
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37]/25 bg-white text-[#1f1a14] transition-all duration-300 hover:border-[#d4af37] hover:bg-[#fff7e6] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2"
                  aria-label={`Quick view ${product.name}`}
                  title={`Quick view ${product.name}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            
            <button 
              type="button"
              onClick={handleAddToBag}
              aria-label={`Add ${product.name} to bag`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-4 py-2 text-sm font-semibold text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)] hover:shadow-[0_16px_40px_rgba(212,175,55,0.28)] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2"
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
