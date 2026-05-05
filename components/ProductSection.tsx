"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Eye, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import QuickViewModal from "./QuickViewModal";
import { createSupabaseClient } from "@/lib/supabase/client";

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
}

type SupabaseProduct = Partial<Omit<Product, "decants">> & {
  decants?: unknown;
  notes?: unknown;
};

interface ProductQuickViewNotes {
  story?: string;
  top?: string[];
  heart?: string[];
  base?: string[];
  madeWith?: string;
  bestFor?: string;
}

const normalizeNotesArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const notes = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return notes.length > 0 ? notes : undefined;
};

const normalizeQuickViewNotes = (value: unknown): ProductQuickViewNotes | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const notes = value as Record<string, unknown>;

  const normalized = {
    story: typeof notes.story === "string" ? notes.story.trim() : undefined,
    top: normalizeNotesArray(notes.top),
    heart: normalizeNotesArray(notes.heart),
    base: normalizeNotesArray(notes.base),
    madeWith: typeof notes.madeWith === "string" ? notes.madeWith.trim() : undefined,
    bestFor: typeof notes.bestFor === "string" ? notes.bestFor.trim() : undefined,
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

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
}

function DecantDropdown({ product, selectedDecant, isOpen, onToggle, onClose, onSelect }: DecantDropdownProps) {
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

  return (
    <div className="relative z-[1000] mt-4 min-h-[48px] w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updatePosition();
          onToggle();
        }}
        className="flex w-full items-center justify-between rounded-full border border-yellow-300 bg-white/95 px-5 py-3 text-left text-sm font-bold text-neutral-900 shadow-[0_12px_30px_rgba(234,179,8,0.14)] transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-50/70 focus:outline-none focus:ring-4 focus:ring-yellow-200/70"
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
              return (
                <button
                  key={decant.label}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(decant);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-all duration-200 ${
                    isSelected
                      ? "bg-yellow-400 text-black shadow-[0_8px_22px_rgba(234,179,8,0.28)]"
                      : "text-neutral-800 hover:bg-yellow-50 hover:text-yellow-700"
                  }`}
                >
                  <span>{decant.label}</span>
                  <span className={isSelected ? "text-black" : "text-yellow-700"}>
                    {formatMmk(decant.price)}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onAddToBag: (product: Product) => void;
  onQuickView: (product: Product) => void;
  selectedDecants: Record<string, { label: string; price: number }>;
  setSelectedDecants: React.Dispatch<React.SetStateAction<Record<string, { label: string; price: number }>>>;
  openDecantDropdown: string | null;
  setOpenDecantDropdown: React.Dispatch<React.SetStateAction<string | null>>;
}

function ProductCard({ product, onAddToBag, onQuickView, selectedDecants, setSelectedDecants, openDecantDropdown, setOpenDecantDropdown }: ProductCardProps) {
  const productKey = String(product.id);
  const productImageUrl = normalizeImageUrl(product.image);
  const [imageSrc, setImageSrc] = useState(productImageUrl);
  const isDecantOpen = openDecantDropdown === productKey;
  const selectedDecant = selectedDecants[productKey];
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
      onAddToBag({ ...product, selectedSize: "Accessory", price: product.price });
      return;
    }
    
    // If a decant is selected, add that size; otherwise add the full-size product.
    if (hasDecants) {
      onAddToBag({
        ...product,
        selectedSize: selectedDecant?.label || "Full Size",
        price: selectedDecant?.price || product.price
      });
      return;
    }
    
    // For products without decants, add directly
    onAddToBag({ ...product, selectedSize: "", price: product.price });
  };

  const handleQuickView = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };

  const getBadgeColor = (badge: string | null) => {
    if (!badge) return "";
    if (badge === "Best Seller") return "bg-yellow-400 text-black";
    if (badge === "New") return "bg-black text-white";
    if (badge === "Limited") return "bg-yellow-600 text-white";
    return "bg-zinc-800 text-white";
  };

  if (isAccessory) {
    return (
      <motion.div
        variants={item}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="group relative h-full min-w-0"
      >
        <div className="group flex h-full min-h-[360px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-yellow-200/70 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300 hover:shadow-[0_24px_70px_rgba(234,179,8,0.15)] sm:min-h-[390px] sm:rounded-[28px]">
          <div className="pointer-events-none absolute -inset-1 rounded-[24px] bg-gradient-to-br from-yellow-400/0 via-yellow-400/0 to-yellow-400/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 sm:rounded-[28px]" />

          <div className="relative z-0 aspect-[4/3] w-full min-w-0 shrink-0 overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-zinc-100">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
              unoptimized={!imageSrc.startsWith("/") && !imageSrc.startsWith("https://images.unsplash.com/")}
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
              onError={() => {
                setImageSrc("https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop");
              }}
            />
            {product.badge && (
              <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${getBadgeColor(product.badge)}`}>
                {product.badge}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
            <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
              {product.brand || "GOSH PERFUME"}
            </p>
            <h3 className="mt-2 line-clamp-1 text-lg font-black leading-tight text-black sm:text-xl">
              {product.name}
            </h3>
            <p className="mt-2 line-clamp-2 min-h-[44px] text-sm leading-6 text-zinc-600">
              {product.description || "Premium accessory for your fragrance routine."}
            </p>

            <div className="mt-auto space-y-3 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xl font-black text-yellow-600 sm:text-2xl">
                  {formatMmk(product.price)}
                </span>
                <button
                  type="button"
                  onClick={handleQuickView}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 bg-white text-black transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                  aria-label="Quick view"
                  title="Quick view"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToBag}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-yellow-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Bag
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={item}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full min-w-0"
    >
      <div className="group flex h-full min-h-[500px] min-w-0 flex-col overflow-hidden rounded-[26px] border border-yellow-200/60 bg-white shadow-[0_18px_55px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300 hover:shadow-[0_26px_80px_rgba(234,179,8,0.16)] sm:min-h-[560px] sm:rounded-[32px]">
        {/* Gold glow effect on hover */}
        <div className="pointer-events-none absolute -inset-1 rounded-[26px] bg-gradient-to-br from-yellow-400/0 via-yellow-400/0 to-yellow-400/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 sm:rounded-[32px]" />
        
        {/* Image Container - Fixed Square Ratio */}
        <div className="relative z-0 aspect-square w-full min-w-0 shrink-0 overflow-hidden bg-gradient-to-br from-yellow-50 to-zinc-100">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            loading="lazy"
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            unoptimized={!imageSrc.startsWith("/") && !imageSrc.startsWith("https://images.unsplash.com/")}
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            onError={() => {
              setImageSrc("https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop");
            }}
          />
          
          {/* Badge */}
          {product.badge && (
            <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${getBadgeColor(product.badge)}`}>
              {product.badge}
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Content - Flex Column with Fixed Heights */}
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          {/* Brand - Truncate */}
          <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
            {product.brand || product.category || "GOSH PERFUME"}
          </p>
          
          {/* Product Name - Line Clamp 2 with Min Height */}
          <h3 className="mt-2 line-clamp-2 min-h-[48px] text-lg font-black leading-tight text-black sm:min-h-[56px] sm:text-xl">
            {product.name}
          </h3>
          
          {/* Description - Line Clamp 3 with Min Height */}
          <p className="mt-3 line-clamp-3 min-h-[66px] text-sm leading-6 text-zinc-600 sm:min-h-[72px]">
            {product.description || "Premium luxury perfume crafted for an elegant everyday scent."}
          </p>
          
          {/* Decant Dropdown using Portal - Only for non-accessories with decants */}
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
            />
          )}
          
          {/* Spacer for accessories to maintain card height */}
          {(isAccessory || !hasDecants) && (
            <div className="mt-4 min-h-[48px]" />
          )}
          
          {/* Price and Buttons - Push to Bottom with mt-auto */}
          <div className="mt-auto space-y-3 pt-5">
            <div className="flex min-w-0 flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
              <span className="shrink-0 text-2xl font-black text-yellow-600">
                {formatMmk(isAccessory || !hasDecants ? product.price : (selectedDecant?.price || product.price))}
              </span>
              
              <button 
                type="button"
                onClick={handleQuickView}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 bg-white text-black transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                aria-label="Quick view"
                title="Quick view"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            
            <button 
              type="button"
              onClick={handleAddToBag}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-yellow-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Bag
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ProductSectionProps {
  selectedBrand?: string;
  onBrandSelect?: (brand: string) => void;
  onAddToBag: (product: Product) => void;
}

export default function ProductSection({ selectedBrand = "All", onBrandSelect, onAddToBag }: ProductSectionProps) {
  const supabase = createSupabaseClient();
  
  // Original fallback products - NEVER remove these, they are the main products
  const fallbackProducts: Product[] = [
    {
      id: 1,
      name: "Golden Noir",
      brand: "Dior",
      price: 89,
      description: "Warm amber, vanilla, dark wood",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop",
      badge: "Best Seller",
      decants: [
        { label: "5ml", price: 12 },
        { label: "10ml", price: 20 },
        { label: "20ml", price: 35 },
        { label: "30ml", price: 48 }
      ]
    },
    {
      id: 2,
      name: "Velvet Oud",
      brand: "Chanel",
      price: 110,
      description: "Deep oud, soft floral sweetness",
      image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop",
      badge: "New",
      decants: [
        { label: "5ml", price: 15 },
        { label: "10ml", price: 25 },
        { label: "20ml", price: 42 },
        { label: "30ml", price: 58 }
      ]
    },
    {
      id: 3,
      name: "Midnight Amber",
      brand: "Gucci",
      price: 96,
      description: "Elegant spicy amber evening",
      image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      decants: [
        { label: "5ml", price: 13 },
        { label: "10ml", price: 22 },
        { label: "20ml", price: 38 },
        { label: "30ml", price: 52 }
      ]
    },
    {
      id: 4,
      name: "Sunlit Bloom",
      brand: "YSL",
      price: 78,
      description: "Fresh citrus, soft floral finish",
      image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop",
      badge: "Limited",
      decants: [
        { label: "5ml", price: 10 },
        { label: "10ml", price: 18 },
        { label: "20ml", price: 30 },
        { label: "30ml", price: 42 }
      ]
    },
    {
      id: 5,
      name: "Royal Musk",
      brand: "Versace",
      price: 120,
      description: "Luxury musk, powdery warmth",
      image: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1200&auto=format&fit=crop",
      badge: "Best Seller",
      decants: [
        { label: "5ml", price: 16 },
        { label: "10ml", price: 28 },
        { label: "20ml", price: 48 },
        { label: "30ml", price: 65 }
      ]
    },
    {
      id: 6,
      name: "Night Elixir",
      brand: "Tom Ford",
      price: 99,
      description: "Bold, rich statement scent",
      image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      decants: [
        { label: "5ml", price: 14 },
        { label: "10ml", price: 23 },
        { label: "20ml", price: 39 },
        { label: "30ml", price: 54 }
      ]
    },
    {
      id: 7,
      name: "Ocean Breeze",
      brand: "Jo Malone",
      price: 85,
      description: "Fresh marine, subtle citrus",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop",
      badge: "New",
      decants: [
        { label: "5ml", price: 12 },
        { label: "10ml", price: 19 },
        { label: "20ml", price: 33 },
        { label: "30ml", price: 46 }
      ]
    },
    {
      id: 8,
      name: "Silk Essence",
      brand: "Armani",
      price: 105,
      description: "Sophisticated floral blend",
      image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      decants: [
        { label: "5ml", price: 14 },
        { label: "10ml", price: 24 },
        { label: "20ml", price: 41 },
        { label: "30ml", price: 56 }
      ]
    },
    {
      id: 9,
      name: "Rose Garden",
      brand: "Valentino",
      price: 115,
      description: "Romantic rose, woody base",
      image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop",
      badge: "Limited",
      category: "Floral",
      decants: [
        { label: "5ml", price: 15 },
        { label: "10ml", price: 26 },
        { label: "20ml", price: 44 },
        { label: "30ml", price: 60 }
      ]
    },
    // Accessories
    {
      id: 101,
      name: "Luxury Travel Atomizer",
      brand: "GOSH PERFUME",
      price: 15,
      description: "Premium refillable travel atomizer for carrying your favorite scent anywhere",
      image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=1200&auto=format&fit=crop",
      badge: "New",
      category: "Accessories",
      decants: []
    },
    {
      id: 102,
      name: "Premium Gift Box",
      brand: "GOSH PERFUME",
      price: 8,
      description: "Elegant luxury gift packaging for perfume and decant orders",
      image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      category: "Accessories",
      decants: []
    },
    {
      id: 103,
      name: "Discovery Sample Set",
      brand: "GOSH PERFUME",
      price: 20,
      description: "Curated sample set for discovering your next signature scent",
      image: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?q=80&w=1200&auto=format&fit=crop",
      badge: "Best Seller",
      category: "Accessories",
      decants: []
    },
  ];

  // Original brand filters - NEVER remove these
  const fallbackBrands = ["All", "Dior", "Chanel", "Gucci", "YSL", "Versace", "Tom Ford", "Jo Malone", "Armani", "Valentino"];

  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedDecants, setSelectedDecants] = useState<Record<string, { label: string; price: number }>>({});
  const [openDecantDropdown, setOpenDecantDropdown] = useState<string | null>(null);
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Perfumes");
  const [isMounted, setIsMounted] = useState(false);
  const brandMenuRef = useRef<HTMLDivElement>(null);
  
  // Normalize Supabase product to match original product shape
  const normalizeProduct = (product: SupabaseProduct): Product => {
    // Validate and fix image URL
    let imageUrl = "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
    if (product.image && typeof product.image === "string" && product.image.trim() !== "") {
      const img = product.image.trim();
      // If it's a valid URL (starts with http/https), use it
      if (img.startsWith("http://") || img.startsWith("https://")) {
        imageUrl = img;
      } 
      // If it's a local path starting with /, use it
      else if (img.startsWith("/")) {
        imageUrl = img;
      }
      // Otherwise use placeholder
    }

    return {
      id: product.id || Math.random(),
      name: product.name || "Untitled Perfume",
      brand: product.brand || "",
      price: Number(product.price) || 0,
      description: product.description || "",
      image: imageUrl,
      badge: product.badge || null,
      category: product.category || "",
      notes: normalizeQuickViewNotes(product.notes),
      decants: Array.isArray(product.decants) && product.decants.length > 0
        ? product.decants
        : [
            { label: "5ml", price: 13 },
            { label: "10ml", price: 25 },
            { label: "20ml", price: 42 },
            { label: "30ml", price: 58 },
          ],
    };
  };

  // Fetch Supabase products and merge with fallback (safely)
  useEffect(() => {
    setIsMounted(true);
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      let loadedProducts = [...fallbackProducts];
      
      // Use Supabase as the production source of truth.
      // Fallback products are only for empty/failing Supabase projects.
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          loadedProducts = data.map(normalizeProduct);
        }
      } catch (supabaseError) {
        // Supabase products failed, using fallback products
      }
      
      setProducts(loadedProducts);
    } catch (error) {
      // Error loading products, using fallback products
      setProducts(fallbackProducts);
    } finally {
      setLoading(false);
    }
  };

  // Get brands from combined products (fallback brands + any new brands from Supabase)
  // Filter out non-brand names like "Luxury Collection", "Private Blend", etc.
  const hiddenFilterNames = [
    "Luxury Collection",
    "Private Blend",
    "Collection",
    "Men",
    "Women",
    "Unisex",
    "GOSH",
    "",
  ];

  const brands = [
    "All",
    ...Array.from(new Set([
      ...fallbackBrands.filter(b => b !== "All"),
      ...products
        .map((p) => p.brand)
        .filter(Boolean)
        .filter((brand) => !hiddenFilterNames.includes(brand))
    ]))
  ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => {
    if (a === "All") return -1;
    if (b === "All") return 1;
    return a.localeCompare(b);
  });
  
  // Close brand menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isBrandMenuOpen && brandMenuRef.current && !brandMenuRef.current.contains(event.target as Node)) {
        setIsBrandMenuOpen(false);
      }
    };
    
    if (isBrandMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isBrandMenuOpen]);
  
  const handleQuickView = (product: typeof products[0]) => {
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
    const finalPrice = selectedDecant?.price || product.price;
    
    for (let i = 0; i < quantity; i++) {
      onAddToBag({ ...product, selectedSize: finalSize, price: finalPrice });
    }
  };

  const filteredProducts = products.filter((product) => {
    // Normalize category for comparison
    const normalizedCategory = String(product.category || "").toLowerCase().trim();
    const isAccessory = normalizedCategory === "accessories" || normalizedCategory === "accessory";
    
    // Filter by brand
    const matchesBrand = selectedBrand === "All" || product.brand === selectedBrand;
    
    // Filter by category
    let matchesCategory = true;
    
    if (selectedCategory === "All") {
      // Show only perfumes, NOT accessories
      matchesCategory = !isAccessory;
    } else if (selectedCategory === "Perfumes") {
      // Show only non-accessory products
      matchesCategory = !isAccessory;
    } else if (selectedCategory === "Accessories") {
      // Show only accessory products
      matchesCategory = isAccessory;
    } else {
      // Specific perfume category (Woody, Oriental, Floral, Fresh, Citrus)
      // Should NOT show accessories
      matchesCategory = !isAccessory && normalizedCategory === selectedCategory.toLowerCase();
    }
    
    return matchesBrand && matchesCategory;
  });

  const getBrandTitle = () => {
    if (selectedCategory === "Accessories") return "Accessories";
    if (selectedCategory === "Perfumes") {
      return selectedBrand === "All" ? "All Perfumes" : `${selectedBrand} Perfumes`;
    }
    return selectedBrand === "All" ? "All Perfumes" : `${selectedBrand} Collection`;
  };

  const getProductCount = () => {
    const count = filteredProducts.length;
    if (selectedCategory === "Accessories") {
      return `${count} luxury accessor${count === 1 ? 'y' : 'ies'}`;
    }
    return `${count} luxury perfume${count !== 1 ? 's' : ''}`;
  };

  return (
    <section
      role="region"
      aria-label="Product catalog"
      id="products"
      className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
    >
      {/* Screen Reader Loading Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {loading ? "Loading products, please wait..." : `${getProductCount()} loaded`}
      </div>

      {/* Section Header */}
      <motion.div
        key={selectedBrand}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 text-center sm:mb-8"
      >
        <p className="text-xs uppercase tracking-[0.32em] text-yellow-600 sm:text-sm sm:tracking-[0.35em]">
          Our Collection
        </p>
        <h2 className="mt-3 text-3xl font-black text-black sm:mt-4 sm:text-5xl">
          {getBrandTitle()}
        </h2>
      </motion.div>

      {/* Filter Bar with Product Count and Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm font-semibold text-neutral-500">
            {getProductCount()}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-[26px] border border-yellow-100 bg-white/85 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          {/* Category Filter Pills */}
          <div className="grid grid-cols-[0.7fr_1fr_1.35fr] gap-2 sm:flex sm:overflow-x-auto sm:pb-0">
            {["Perfumes", "Accessories"].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`min-w-0 rounded-full px-2 py-2.5 text-[13px] font-bold transition-all duration-300 min-[390px]:px-3 min-[390px]:text-sm sm:shrink-0 sm:px-5 ${
                  selectedCategory === category
                    ? "bg-yellow-400 text-black shadow-[0_10px_25px_rgba(234,179,8,0.28)]"
                    : "border border-yellow-300 bg-white text-neutral-700 hover:bg-yellow-50"
                }`}
              >
                <span className="block whitespace-nowrap">{category}</span>
              </button>
            ))}
          </div>

          {/* Brand Filter Dropdown */}
          {onBrandSelect && brands.length > 1 && (
          <motion.div
            ref={brandMenuRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-40 flex w-full justify-center overflow-visible sm:z-30 sm:block sm:w-auto"
          >
            <button
              type="button"
              onClick={() => {
                setIsBrandMenuOpen((prev) => !prev);
              }}
              className="group inline-flex h-11 w-full max-w-[280px] items-center justify-center gap-2 rounded-full border border-yellow-300 bg-yellow-400 px-6 text-sm font-black text-black shadow-[0_16px_40px_rgba(234,179,8,0.22)] transition-all duration-300 active:scale-95 sm:flex sm:h-auto sm:w-auto sm:min-w-[170px] sm:justify-between sm:gap-0 sm:px-5 sm:py-3 sm:shadow-[0_14px_35px_rgba(234,179,8,0.28)] sm:hover:-translate-y-0.5 sm:hover:bg-yellow-300"
              aria-haspopup="listbox"
              aria-expanded={isBrandMenuOpen}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                Brands
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${
                  isBrandMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {/* Desktop dropdown - compact */}
              {isBrandMenuOpen && (
                <motion.div
                  key="desktop-brand-dropdown"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-[calc(100%+10px)] z-[999] hidden w-[250px] overflow-hidden rounded-2xl border border-yellow-200 bg-white/95 p-2 shadow-[0_18px_45px_rgba(0,0,0,0.14),0_0_24px_rgba(234,179,8,0.16)] backdrop-blur sm:block"
                >
                  <div className="mb-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsBrandMenuOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-100 text-xs font-black text-black transition hover:bg-yellow-200"
                      aria-label="Close brands menu"
                    >
                      ×
                    </button>
                  </div>
                  <div className="scrollbar-auto-hide grid max-h-[245px] gap-1 overflow-y-auto">
                    {brands.map((brand, index) => (
                      <motion.button
                        key={`desktop-${isBrandMenuOpen}-${brand || "empty"}-${index}`}
                        type="button"
                        initial={{ opacity: 0, x: 22 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.52,
                          delay: index * 0.09,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                        onClick={() => {
                          onBrandSelect?.(brand);
                          setIsBrandMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition-all duration-300 ${
                          selectedBrand === brand
                            ? "bg-yellow-400 text-black shadow-[0_8px_18px_rgba(234,179,8,0.20)]"
                            : "bg-neutral-50 text-neutral-700 hover:bg-yellow-50 hover:text-yellow-700"
                        }`}
                      >
                        <span className="truncate">{brand || "Unbranded"}</span>
                        {selectedBrand === brand && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {filteredProducts.length > 0 ? (
          <motion.div
            key={selectedBrand}
            variants={container}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredProducts.map((product, index) => (
              <ProductRevealCard key={`${selectedBrand}-${product.id}`} index={index}>
                <ProductCard 
                  product={product} 
                  onAddToBag={onAddToBag}
                  onQuickView={handleQuickView}
                  selectedDecants={selectedDecants}
                  setSelectedDecants={setSelectedDecants}
                  openDecantDropdown={openDecantDropdown}
                  setOpenDecantDropdown={setOpenDecantDropdown}
                />
              </ProductRevealCard>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-50 text-yellow-600">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-black">No perfumes found</h3>
              <p className="text-zinc-600">
                No perfumes available for <span className="font-medium text-yellow-600">{selectedBrand}</span> yet.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Check back soon for new arrivals!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isBrandMenuOpen && onBrandSelect && brands.length > 1 && (
              <motion.div
                key="mobile-brand-popup"
                className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/35 px-4 pb-4 pt-20 backdrop-blur-[2px] sm:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setIsBrandMenuOpen(false)}
              >
                <motion.div
                  role="listbox"
                  aria-label="Choose brand"
                  initial={{ opacity: 0, y: 34, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 28, scale: 0.97 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => event.stopPropagation()}
                  className="w-full max-w-[380px] overflow-hidden rounded-[30px] border border-yellow-200 bg-[#fffdf6]/98 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.28),0_0_42px_rgba(234,179,8,0.18)] backdrop-blur-xl"
                >
                  <div className="mb-4 flex items-start justify-between gap-4 px-1">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-600">
                        Filter by brand
                      </p>
                      <h3 className="mt-1 text-xl font-black text-neutral-950">
                        Choose Brand
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBrandMenuOpen(false)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-lg font-black text-black shadow-[0_12px_28px_rgba(234,179,8,0.28)] transition active:scale-95"
                      aria-label="Close brands popup"
                    >
                      ×
                    </button>
                  </div>

                  <div className="scrollbar-auto-hide grid max-h-[62vh] gap-2 overflow-y-auto pr-1">
                    {brands.map((brand, index) => {
                      const active = selectedBrand === brand;
                      const label = brand || "Unbranded";

                      return (
                        <motion.button
                          key={`mobile-popup-${brand || "empty"}-${index}`}
                          type="button"
                          role="option"
                          aria-selected={active}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.24,
                            delay: Math.min(index * 0.025, 0.18),
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          onClick={() => {
                            onBrandSelect?.(brand);
                            setIsBrandMenuOpen(false);
                          }}
                          className={`flex min-h-12 w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition-all duration-300 ${
                            active
                              ? "bg-yellow-400 text-black shadow-[0_12px_28px_rgba(234,179,8,0.22)]"
                              : "bg-white text-neutral-700 active:bg-yellow-50"
                          }`}
                        >
                          <span className="truncate">{label}</span>
                          {active && <Check className="h-4 w-4 shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={handleCloseQuickView}
        onAddToBag={handleQuickViewAddToBag}
        selectedDecants={selectedDecants}
        setSelectedDecants={setSelectedDecants}
      />

    </section>
  );
}
