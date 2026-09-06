"use client";
import devLog from "@/lib/dev-log";

import { motion } from "framer-motion";
import { ShoppingBag, Eye, Tag, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import QuickViewModal from "./QuickViewModal";

interface ProductPromotion {
  id: string;
  product_id: string;
  promotion_price: number;
  is_active: boolean;
  start_at: string;
  end_at: string;
  product?: Product | null;
}

interface Product {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  badge: string | null;
  category?: string;
  decants: { label: string; price: number }[];
  is_active?: boolean;
  selectedSize?: string;
  sizes?: { label: string; price: number }[];
  notes?: ProductQuickViewNotes;
  promotion_price?: number;
}

interface ProductQuickViewNotes {
  story?: string;
  top?: string[];
  heart?: string[];
  base?: string[];
  madeWith?: string;
  bestFor?: string;
}

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
};

// Normalize image URL helper
const normalizeImageUrl = (url?: string | null): string => {
  if (!url || url.trim() === "") return "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return u;
  if (u.startsWith("photo-")) return `https://images.unsplash.com/${u}`;
  return "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
};

const formatMmk = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;

// Calculate discount percentage
const calculateDiscount = (originalPrice: number, promotionPrice: number): number => {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - promotionPrice) / originalPrice) * 100);
};

// Scroll reveal wrapper component
function ProductRevealCard({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${Math.min(index * 80, 480)}ms`,
      }}
      className={`min-w-0 transition-all duration-700 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

// Portal-based Decant Dropdown Component
interface DecantDropdownProps {
  product: Product;
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
    
    // Close dropdown if trigger is outside viewport
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      onClose();
      return;
    }
    
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const maxLeft = window.innerWidth - width - viewportPadding;
    let top = rect.bottom + 10;
    
    // If dropdown would go below viewport, open upward
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

  // Update position on scroll/resize when open
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

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Calculate promotion decant prices proportionally
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
        <span
          className={`shrink-0 text-yellow-600 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {mounted && isOpen &&
        createPortal(
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
                        {formatMmk(decant.price)}
                      </span>
                    )}
                    <span className={isSelected ? "text-black" : "text-yellow-700"}>
                      {formatMmk(finalPrice)}
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

interface PromotionProductCardProps {
  product: Product;
  promotionPrice: number;
  onAddToBag: (product: Product) => void;
  onQuickView: (product: Product) => void;
  priority?: boolean;
  selectedDecants: Record<string, { label: string; price: number }>;
  setSelectedDecants: React.Dispatch<React.SetStateAction<Record<string, { label: string; price: number }>>>;
  openDecantDropdown: string | null;
  setOpenDecantDropdown: React.Dispatch<React.SetStateAction<string | null>>;
}

function PromotionProductCard({ 
  product, 
  promotionPrice,
  onAddToBag, 
  onQuickView, 
  priority = false, 
  selectedDecants, 
  setSelectedDecants, 
  openDecantDropdown, 
  setOpenDecantDropdown 
}: PromotionProductCardProps) {
  const productKey = String(product.id);
  const productImageUrl = normalizeImageUrl(product.image);
  const [imageSrc, setImageSrc] = useState(productImageUrl);
  const isDecantOpen = openDecantDropdown === productKey;
  const selectedDecant = selectedDecants[productKey];
  const isAccessory = product.category === "Accessories";
  const hasDecants = Array.isArray(product.decants) && product.decants.length > 0;
  const discountPercent = calculateDiscount(product.price, promotionPrice);

  useEffect(() => {
    setImageSrc(productImageUrl);
  }, [productImageUrl]);
  
  const handleAddToBag = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // For accessories, add directly without decant selection
    if (isAccessory) {
      onAddToBag({ ...product, selectedSize: "Accessory", price: promotionPrice });
      return;
    }
    
    // If a decant is selected, add that size; otherwise add the full-size product with promotion price
    if (hasDecants) {
      onAddToBag({
        ...product,
        selectedSize: selectedDecant?.label || "Full Size",
        price: selectedDecant?.price || promotionPrice,
        promotion_price: promotionPrice
      });
      return;
    }
    
    // For products without decants, add directly with promotion price
    onAddToBag({ ...product, selectedSize: "", price: promotionPrice, promotion_price: promotionPrice });
  };

  const handleQuickView = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView({ ...product, promotion_price: promotionPrice });
  };

  return (
    <motion.div
      variants={item}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full min-w-0"
    >
      <div className="group flex h-[520px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-red-400/40 bg-white shadow-[0_18px_55px_rgba(220,38,38,0.1)] transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:shadow-[0_18px_45px_rgba(220,38,38,0.18),0_6px_18px_rgba(220,38,38,0.12)] sm:h-full sm:min-h-[370px] sm:rounded-[28px]">
        {/* Red glow effect on hover for promotion */}
        <div className="pointer-events-none absolute -inset-1 rounded-[26px] bg-gradient-to-br from-red-500/0 via-red-400/0 to-red-300/35 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 sm:rounded-[32px]" />
        
        {/* Image Container */}
        <div className="relative z-0 h-[185px] w-full min-w-0 shrink-0 overflow-hidden bg-gradient-to-br from-red-50 via-white to-orange-50 sm:h-[185px] lg:h-[205px]">
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
          
          {/* Promotion Badge - Prominent */}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 shadow-lg">
              <Tag className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {discountPercent}% OFF
              </span>
            </div>
            {/* Product Badge - Hidden when product has active promotion */}
            {/* Normal badges are not shown for promoted products */}
          </div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          {/* Brand */}
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-black uppercase tracking-[0.18em] text-red-700">
              {product.brand || product.category || "GOSH PERFUME"}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-red-400/45 bg-red-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-red-700">
              <Clock className="h-2.5 w-2.5" />
              SALE
            </span>
          </div>
          
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
              onToggle={() =>
                setOpenDecantDropdown((prev: string | null) =>
                  prev === productKey ? null : productKey
                )
              }
              onClose={() => setOpenDecantDropdown(null)}
              onSelect={(decant) =>
                setSelectedDecants((prev) => ({
                  ...prev,
                  [productKey]: decant,
                }))
              }
              promotionPrice={promotionPrice}
            />
          )}
          
          {/* Spacer for accessories to maintain card height */}
          {(isAccessory || !hasDecants) && (
            <div className="mt-2 min-h-[18px] sm:mt-3 sm:min-h-[24px]" />
          )}
          
          {/* Price and Buttons */}
          <div className="mt-auto space-y-2 pt-2 sm:pt-2.5">
            <div className="flex min-w-0 flex-col gap-2.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-500 line-through">
                  {formatMmk(isAccessory || !hasDecants ? product.price : (selectedDecant?.price / (promotionPrice / product.price) || product.price))}
                </span>
                <span className="shrink-0 text-xl font-black text-red-600 sm:text-2xl">
                  {formatMmk(isAccessory || !hasDecants ? promotionPrice : (selectedDecant?.price || promotionPrice))}
                </span>
              </div>
              
              <button 
                type="button"
                onClick={handleQuickView}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-red-400/30 bg-white text-red-600 transition-all duration-300 hover:border-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                aria-label={`Quick view ${product.name}`}
                title={`Quick view ${product.name}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            
            <button 
              type="button"
              onClick={handleAddToBag}
              aria-label={`Add ${product.name} to bag`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-500/45 bg-[linear-gradient(135deg,#ef4444,#f87171)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(239,68,68,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#dc2626,#ef4444)] hover:shadow-[0_16px_40px_rgba(239,68,68,0.38)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Add to Bag
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface PromotionProductsSectionProps {
  onAddToBag: (product: Product) => void;
}

export default function PromotionProductsSection({ onAddToBag }: PromotionProductsSectionProps) {
  const [promotions, setPromotions] = useState<ProductPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedDecants, setSelectedDecants] = useState<Record<string, { label: string; price: number }>>({});
  const [openDecantDropdown, setOpenDecantDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/product-promotions/active");
      
      if (!response.ok) {
        devLog.error("Failed to fetch promotions:", response.status);
        return;
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.promotions)) {
        setPromotions(result.promotions);
      }
    } catch (error) {
      devLog.error("Error loading promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false);
    setTimeout(() => setQuickViewProduct(null), 300);
  };

  const handleQuickViewAddToBag = (product: Product, quantity: number) => {
    const selectedDecant = selectedDecants[product.id];
    const finalSize = selectedDecant?.label || "";
    const finalPrice = selectedDecant?.price || product.promotion_price || product.price;
    
    for (let i = 0; i < quantity; i++) {
      onAddToBag({ ...product, selectedSize: finalSize, price: finalPrice });
    }
  };

  return (
    <section
      role="region"
      aria-label="Promotional products"
      id="promotions"
      className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 text-center sm:mb-8"
      >
        <p className="text-xs uppercase tracking-[0.32em] text-[#6f1d1b] sm:text-sm sm:tracking-[0.35em]">
          Limited Time Offers
        </p>
        <h1 className="mt-3 text-3xl font-black text-[#1f1a14] sm:mt-4 sm:text-5xl">
          Special Promotions
        </h1>
        <p className="mt-3 text-sm text-[#7a6a55] sm:text-base">
          Discover exclusive deals on premium perfumes — while stocks last!
        </p>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-[400px] items-center justify-center"
        >
          <div className="flex flex-col items-center gap-6">
            {/* Spinner */}
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.05, 1],
              }}
              transition={{
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                },
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              className="relative"
            >
              {/* Outer ring */}
              <div className="h-20 w-20 rounded-full border-4 border-[#d4af37]/30 border-t-[#d4af37]" />
              
              {/* Inner sparkle */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <ShoppingBag className="h-8 w-8 text-[#d4af37]" />
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col items-center gap-2"
            >
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-sm font-medium tracking-wider text-[#7a6a55] sm:text-base"
              >
                Loading promotions...
              </motion.p>
            </motion.div>

            {/* Animated dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                  className="h-2 w-2 rounded-full bg-[#d4af37]"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && promotions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex min-h-[400px] flex-col items-center justify-center text-center"
        >
          <Tag className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-xl font-bold text-[#1f1a14]">No Active Promotions</h3>
          <p className="mt-2 text-sm text-[#7a6a55]">
            Check back soon for exciting deals on premium perfumes!
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-6 py-3 text-sm font-semibold text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)]"
          >
            Browse All Products
          </Link>
        </motion.div>
      )}

      {/* Products Grid */}
      {!loading && promotions.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4"
        >
          {promotions.map((promo, index) => {
            if (!promo.product) return null;
            
            return (
              <ProductRevealCard key={promo.id} index={index}>
                <PromotionProductCard
                  product={promo.product}
                  promotionPrice={promo.promotion_price}
                  onAddToBag={onAddToBag}
                  onQuickView={handleQuickView}
                  priority={index < 4}
                  selectedDecants={selectedDecants}
                  setSelectedDecants={setSelectedDecants}
                  openDecantDropdown={openDecantDropdown}
                  setOpenDecantDropdown={setOpenDecantDropdown}
                />
              </ProductRevealCard>
            );
          })}
        </motion.div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isOpen={isQuickViewOpen}
          onClose={handleCloseQuickView}
          onAddToBag={handleQuickViewAddToBag}
          selectedDecants={selectedDecants}
          setSelectedDecants={setSelectedDecants}
        />
      )}
    </section>
  );
}
