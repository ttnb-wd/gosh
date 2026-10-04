"use client";
import StudioModal from "@/components/ui/StudioModal";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

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
  notes?: ProductQuickViewNotes;
  promotion_price?: number; // Promotional price if available
}

interface ProductQuickViewNotes {
  story?: string;
  top?: string[];
  heart?: string[];
  base?: string[];
  madeWith?: string;
  bestFor?: string;
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToBag: (product: Product, quantity: number) => void;
  selectedDecants: Record<string, { label: string; price: number }>;
  setSelectedDecants: React.Dispatch<React.SetStateAction<Record<string, { label: string; price: number }>>>;
}

const fallbackQuickViewImage =
  "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";

export default function QuickViewModal(props: QuickViewModalProps) {
  const { product, isOpen, onClose } = props;
  const [activeTab, setActiveTab] = useState<"top" | "heart" | "base">("top");
  const [showDesktopImage, setShowDesktopImage] = useState(false);
  const [imageSrc, setImageSrc] = useState(fallbackQuickViewImage);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateImageVisibility = () => setShowDesktopImage(mediaQuery.matches);

    updateImageVisibility();
    mediaQuery.addEventListener("change", updateImageVisibility);

    return () => {
      mediaQuery.removeEventListener("change", updateImageVisibility);
    };
  }, []);

  useEffect(() => {
    setImageSrc(product?.image || fallbackQuickViewImage);
  }, [product?.image]);

  if (!product) return null;

  const isAccessory = String(product.category || "").toLowerCase().trim() === "accessories";
  const quickViewNotes = product.notes || {};
  const scentNotes = {
    top: quickViewNotes.top?.length
      ? quickViewNotes.top
      : isAccessory
      ? ["Refillable", "Travel Ready", "Gift Friendly"]
      : ["Bergamot", "Citrus", "Fresh Herbs"],
    heart: quickViewNotes.heart?.length
      ? quickViewNotes.heart
      : isAccessory
      ? ["Glass", "Metal", "Premium Finish"]
      : ["Jasmine", "Rose", "Lavender"],
    base: quickViewNotes.base?.length
      ? quickViewNotes.base
      : isAccessory
      ? ["Keep Dry", "Clean Gently", "Store Safely"]
      : ["Sandalwood", "Vanilla", "Amber"],
  };
  const noteTabLabels = isAccessory
    ? { top: "Features", heart: "Materials", base: "Care" }
    : { top: "Top Notes", heart: "Heart Notes", base: "Base Notes" };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-overlay "
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overscroll-contain p-2 sm:p-4 md:p-6">
            <StudioModal label="Fragrance details" onDismiss={onClose} lockScroll={true}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="studio-quickview relative mx-auto my-2 grid max-h-[92vh] w-full max-w-[94vw] grid-cols-1 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface shadow-panel sm:my-6 sm:rounded-xl lg:max-h-[88vh] lg:max-w-5xl lg:grid-cols-2 lg:overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand shadow-panel transition hover:scale-105 hover:bg-brand sm:right-4 sm:top-4 sm:h-9 sm:w-9 sm:text-xl"
                aria-label="Close quick view"
              >
                ×
              </button>

              {/* MOBILE IMAGE SECTION */}
              <div className="relative h-[42vh] min-h-[260px] overflow-hidden bg-surface  sm:h-[56vh] sm:min-h-[420px] lg:hidden">
                {/* Only show badge if product does NOT have promotional pricing */}
                {!product.promotion_price && product.badge && (
                  <div className="absolute left-6 top-6 z-20 rounded-full bg-brand px-5 py-2 text-xs font-bold uppercase tracking-widest text-on-brand shadow-panel">
                    {product.badge}
                  </div>
                )}
                <Image
                  src={imageSrc}
                  alt={product.name}
                  fill
                  sizes="94vw"
                  unoptimized={imageSrc.includes("ik.imagekit.io")}
                  className="object-cover object-center"
                  onError={() => {
                    setImageSrc(fallbackQuickViewImage);
                  }}
                />
              </div>

              {/* LEFT IMAGE SECTION - DESKTOP ONLY */}
              {showDesktopImage && (
                <div className="relative hidden overflow-hidden bg-surface lg:block lg:h-[88vh] lg:max-h-[88vh] lg:min-h-0">
                  {/* Only show badge if product does NOT have promotional pricing */}
                  {!product.promotion_price && product.badge && (
                    <div className="absolute left-6 top-6 z-20 rounded-full bg-brand px-5 py-2 text-xs font-bold uppercase tracking-widest text-on-brand shadow-panel">
                      {product.badge}
                    </div>
                  )}
                  <Image
                    src={imageSrc}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    unoptimized={imageSrc.includes("ik.imagekit.io")}
                    className="object-cover object-center"
                    onError={() => {
                      setImageSrc(fallbackQuickViewImage);
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-line/10" />
                </div>
              )}

              {/* RIGHT DETAILS SECTION - ONLY THIS SCROLLS */}
              <div className="scrollbar-auto-hide overflow-x-visible p-4 pr-5 sm:p-8 md:p-10 lg:max-h-[88vh] lg:overflow-y-auto lg:overscroll-contain">
                  {/* Brand & Name */}
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent sm:mb-2 sm:text-xs sm:tracking-[0.2em]">
                    {product.brand}
                  </p>
                  <h2 className="mb-4 pr-10 text-2xl font-semibold leading-tight text-ink sm:mb-6 sm:pr-0 sm:text-3xl">
                    {product.name}
                  </h2>

                  {/* Description */}
                  <p className="mb-4 text-sm leading-relaxed text-secondary sm:mb-6 sm:text-base">
                    {product.description}
                  </p>

                  {/* The Story */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="mb-2 text-base font-bold text-ink sm:mb-3 sm:text-lg">{isAccessory ? "Product Details" : "The Story"}</h3>
                    <p className="text-sm text-secondary leading-relaxed">
                      {quickViewNotes.story ||
                        (isAccessory
                          ? "Designed for daily fragrance routines, this accessory adds a polished, practical touch to storing, carrying, or gifting perfume."
                          : "Crafted by master perfumers, this exquisite fragrance captures the essence of luxury and sophistication. Each note is carefully selected to create a harmonious blend that evolves beautifully throughout the day.")}
                    </p>
                  </div>

                  {/* Scent Notes */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="mb-2 text-base font-bold text-ink sm:mb-3 sm:text-lg">{isAccessory ? "Accessory Notes" : "Scent Notes"}</h3>
                    
                    {/* Tabs */}
                    <div className="mb-3 flex flex-wrap gap-1.5 sm:mb-4 sm:gap-2">
                      {(["top", "heart", "base"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                            activeTab === tab
                              ? "bg-brand text-on-brand"
                              : "bg-surface-muted text-secondary hover:bg-surface-muted"
                          }`}
                        >
                          {noteTabLabels[tab]}
                        </button>
                      ))}
                    </div>

                    {/* Notes Content */}
                    <div className="flex flex-wrap gap-2">
                      {scentNotes[activeTab].map((note) => (
                        <span
                          key={note}
                          className="rounded-full border border-line bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Made With */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="mb-2 text-base font-bold text-ink sm:mb-3 sm:text-lg">Made With</h3>
                    <p className="text-sm text-secondary">
                      {quickViewNotes.madeWith ||
                        (isAccessory
                          ? "Durable materials selected for everyday use, clean presentation, and premium perfume care."
                          : "Premium natural ingredients, ethically sourced from around the world. Cruelty-free and vegan-friendly.")}
                    </p>
                  </div>

                  {/* Best For */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="mb-2 text-base font-bold text-ink sm:mb-3 sm:text-lg">Best For</h3>
                    <p className="text-sm text-secondary">
                      {quickViewNotes.bestFor ||
                        (isAccessory
                          ? "Travel, gifting, handbag carry, shelf display, and perfume refill routines."
                          : "Evening wear, special occasions, romantic dinners, and making a lasting impression.")}
                    </p>
                  </div>

                  {/* How to Use */}
                  {!isAccessory && (
                    <div className="mb-4 sm:mb-6">
                      <h3 className="mb-2 text-base font-bold text-ink sm:mb-3 sm:text-lg">How to Use</h3>
                      <p className="text-sm text-secondary">
                        Apply to pulse points: wrists, neck, and behind ears. For best results, apply to moisturized skin. Do not rub after application.
                      </p>
                    </div>
                  )}
                </div>
            </StudioModal>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
