"use client";

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

  useEffect(() => {
    if (isOpen && product) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, product]);

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
            className="fixed inset-0 z-[9999] bg-black/55 backdrop-blur-md"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto overscroll-contain p-2 sm:p-4 md:items-center md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-auto my-2 grid w-full max-w-[94vw] grid-cols-1 overflow-hidden rounded-2xl border border-yellow-300/70 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35),0_0_45px_rgba(234,179,8,0.25)] sm:my-4 sm:rounded-[28px] lg:my-0 lg:max-h-[88vh] lg:max-w-5xl lg:grid-cols-2"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-xl font-bold text-black shadow-[0_8px_24px_rgba(234,179,8,0.45)] transition hover:scale-105 hover:bg-yellow-300"
                aria-label="Close quick view"
              >
                ×
              </button>

              {/* LEFT IMAGE SECTION - DESKTOP ONLY */}
              {showDesktopImage && (
                <div className="relative hidden overflow-hidden bg-[#fffdf6] lg:block lg:h-[86vh] lg:max-h-[86vh] lg:min-h-0">
                  {product.badge && (
                    <div className="absolute left-6 top-6 z-20 rounded-full bg-yellow-400 px-5 py-2 text-xs font-bold uppercase tracking-widest text-black shadow-[0_10px_25px_rgba(234,179,8,0.35)]">
                      {product.badge}
                    </div>
                  )}
                  <Image
                    src={imageSrc}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    unoptimized={!imageSrc.startsWith("/") && !imageSrc.startsWith("https://images.unsplash.com/")}
                    className="object-cover object-center"
                    onError={() => {
                      setImageSrc(fallbackQuickViewImage);
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
                </div>
              )}

              {/* RIGHT DETAILS SECTION - ONLY THIS SCROLLS */}
              <div className="scrollbar-auto-hide overflow-visible p-6 sm:p-8 md:max-h-[86vh] md:overflow-y-auto md:overflow-x-visible md:overscroll-contain md:p-10">
                  {/* Brand & Name */}
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-600">
                    {product.brand}
                  </p>
                  <h2 className="mb-6 text-3xl font-black text-black">
                    {product.name}
                  </h2>

                  {/* Description */}
                  <p className="mb-6 text-zinc-600 leading-relaxed">
                    {product.description}
                  </p>

                  {/* The Story */}
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-black">{isAccessory ? "Product Details" : "The Story"}</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {quickViewNotes.story ||
                        (isAccessory
                          ? "Designed for daily fragrance routines, this accessory adds a polished, practical touch to storing, carrying, or gifting perfume."
                          : "Crafted by master perfumers, this exquisite fragrance captures the essence of luxury and sophistication. Each note is carefully selected to create a harmonious blend that evolves beautifully throughout the day.")}
                    </p>
                  </div>

                  {/* Scent Notes */}
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-black">{isAccessory ? "Accessory Notes" : "Scent Notes"}</h3>
                    
                    {/* Tabs */}
                    <div className="mb-4 flex gap-2">
                      {(["top", "heart", "base"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === tab
                              ? "bg-yellow-400 text-black"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
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
                          className="rounded-full border border-yellow-400/30 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Made With */}
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-black">Made With</h3>
                    <p className="text-sm text-zinc-600">
                      {quickViewNotes.madeWith ||
                        (isAccessory
                          ? "Durable materials selected for everyday use, clean presentation, and premium perfume care."
                          : "Premium natural ingredients, ethically sourced from around the world. Cruelty-free and vegan-friendly.")}
                    </p>
                  </div>

                  {/* Best For */}
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-black">Best For</h3>
                    <p className="text-sm text-zinc-600">
                      {quickViewNotes.bestFor ||
                        (isAccessory
                          ? "Travel, gifting, handbag carry, shelf display, and perfume refill routines."
                          : "Evening wear, special occasions, romantic dinners, and making a lasting impression.")}
                    </p>
                  </div>

                  {/* How to Use */}
                  {!isAccessory && (
                    <div className="mb-6">
                      <h3 className="mb-3 text-lg font-bold text-black">How to Use</h3>
                      <p className="text-sm text-zinc-600">
                        Apply to pulse points: wrists, neck, and behind ears. For best results, apply to moisturized skin. Do not rub after application.
                      </p>
                    </div>
                  )}
                </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
