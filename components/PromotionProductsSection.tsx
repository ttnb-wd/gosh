"use client";
import { Reveal } from "@/components/ui/StudioMotion";
import StudioLoading from "@/components/ui/StudioLoading";
import devLog from "@/lib/dev-log";

import { motion } from "framer-motion";
import { ShoppingBag, Eye, Tag, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import StudioSelect from "@/components/ui/StudioSelect";
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
  hidden: { opacity: 0, y: 30, scale: 0.98 },
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
function ProductRevealCard({ children, index }: { children: React.ReactNode; index: number }) { return <Reveal className="min-w-0" delay={Math.min(index * .04, .2)}>{children}</Reveal>; }

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
  const getDecantPromotionPrice = (decantPrice: number): number => {
    if (!promotionPrice) return decantPrice;
    const discountRatio = promotionPrice / product.price;
    return Math.round(decantPrice * discountRatio);
  };
  return <StudioSelect className="mt-3" value={selectedDecant?.label ?? ""} placeholder="Select decant size"
    ariaLabel={"Decant size for " + product.name} open={isOpen} onOpenChange={next => { if (next !== isOpen) { if (next) onToggle(); else onClose(); } }}
    options={[{ value: "", label: "Select decant size" }, ...(product.decants ?? []).slice(0, 4).map(decant => ({ value: decant.label, label: decant.label + " · " + formatMmk(getDecantPromotionPrice(decant.price)), icon: promotionPrice ? <span className="text-[10px] text-muted line-through">{formatMmk(decant.price)}</span> : undefined }))]}
    onChange={value => { if (!value) { onSelect({ label: "", price: 0 }); return; } const decant = product.decants?.find(option => option.label === value); if (decant) onSelect({ ...decant, price: getDecantPromotionPrice(decant.price) }); }} />;
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
      <div className="studio-product-card group flex h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border border-destructive/40 bg-surface shadow-panel transition-all duration-300 hover:-translate-y-1 hover:border-destructive/50 hover:shadow-panel sm:h-full sm:min-h-[370px] sm:rounded-xl">
        {/* Red glow effect on hover for promotion */}
        <div className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-br from-destructive/0 via-destructive/0 to-destructive/35 opacity-0 hidden transition-opacity duration-500 group-hover:opacity-100 sm:rounded-xl" />
        
        {/* Image Container */}
        <div className="studio-product-image relative z-0 h-[185px] w-full min-w-0 shrink-0 overflow-hidden bg-surface-muted sm:h-[185px] lg:h-[205px]">
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 shadow-soft">
              <Tag className="h-3.5 w-3.5 text-on-brand" />
              <span className="text-xs font-semibold uppercase tracking-wider text-on-brand">
                {discountPercent}% OFF
              </span>
            </div>
            {/* Product Badge - Hidden when product has active promotion */}
            {/* Normal badges are not shown for promoted products */}
          </div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Content */}
        <div className="studio-product-content flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          {/* Brand */}
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              {product.brand || product.category || "GOSH PERFUME"}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/45 bg-destructive-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive">
              <Clock className="h-2.5 w-2.5" />
              SALE
            </span>
          </div>
          
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
                <span className="text-sm font-bold text-muted line-through">
                  {formatMmk(isAccessory || !hasDecants ? product.price : (selectedDecant?.price / (promotionPrice / product.price) || product.price))}
                </span>
                <span className="shrink-0 text-xl font-semibold text-destructive sm:text-2xl">
                  {formatMmk(isAccessory || !hasDecants ? promotionPrice : (selectedDecant?.price || promotionPrice))}
                </span>
              </div>
              
              <button 
                type="button"
                onClick={handleQuickView}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-destructive/30 bg-surface text-destructive transition-all duration-300 hover:border-destructive hover:bg-destructive-soft focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                aria-label={`Quick view ${product.name}`}
                data-studio-tooltip={`Quick view ${product.name}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            
            <button 
              type="button"
              onClick={handleAddToBag}
              aria-label={`Add ${product.name} to bag`}
              className="studio-button studio-button--primary inline-flex w-full items-center justify-center gap-2 rounded-full border border-destructive/45 bg-surface-muted px-4 py-2 text-sm font-semibold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-muted hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
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
      className="studio-promotion-products mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 text-center sm:mb-8"
      >
        <p className="text-xs uppercase tracking-[0.32em] text-brand sm:text-sm sm:tracking-[0.35em]">
          Limited Time Offers
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-ink sm:mt-4 sm:text-5xl">
          Special Promotions
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          Discover exclusive deals on premium perfumes — while stocks last!
        </p>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <StudioLoading label="Loading promotions…" grid />
      )}

      {/* Empty State */}
      {!loading && promotions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex min-h-[400px] flex-col items-center justify-center text-center"
        >
          <Tag className="h-16 w-16 text-faint" />
          <h3 className="mt-4 text-xl font-bold text-ink">No Active Promotions</h3>
          <p className="mt-2 text-sm text-muted">
            Check back soon for exciting deals on premium perfumes!
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-line bg-brand px-6 py-3 text-sm font-semibold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand"
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
