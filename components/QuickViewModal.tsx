"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  badge: string | null;
  decants?: { label: string; price: number }[];
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToBag: (product: any, quantity: number) => void;
  selectedDecants: Record<number, { label: string; price: number }>;
  setSelectedDecants: React.Dispatch<React.SetStateAction<Record<number, { label: string; price: number }>>>;
}

export default function QuickViewModal({ product, isOpen, onClose, onAddToBag, selectedDecants, setSelectedDecants }: QuickViewModalProps) {
  const [activeTab, setActiveTab] = useState<"top" | "heart" | "base">("top");

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

  const scentNotes = {
    top: ["Bergamot", "Citrus", "Fresh Herbs"],
    heart: ["Jasmine", "Rose", "Lavender"],
    base: ["Sandalwood", "Vanilla", "Amber"]
  };

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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-auto grid max-h-[88vh] w-full max-w-[94vw] grid-cols-1 overflow-hidden rounded-2xl border border-yellow-300/70 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35),0_0_45px_rgba(234,179,8,0.25)] sm:rounded-[28px] md:max-w-5xl md:grid-cols-2"
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

              {/* LEFT IMAGE SECTION - NOT SCROLLABLE */}
              <div className="relative min-h-[320px] overflow-hidden bg-[#fffdf6] md:h-[86vh] md:max-h-[86vh] md:min-h-0">
                {product.badge && (
                  <div className="absolute left-6 top-6 z-20 rounded-full bg-yellow-400 px-5 py-2 text-xs font-bold uppercase tracking-widest text-black shadow-[0_10px_25px_rgba(234,179,8,0.35)]">
                    {product.badge}
                  </div>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
              </div>

              {/* RIGHT DETAILS SECTION - ONLY THIS SCROLLS */}
              <div className="scrollbar-auto-hide max-h-[86vh] overflow-y-auto overflow-x-visible overscroll-contain p-6 sm:p-8 md:p-10">
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
                    <h3 className="mb-3 text-lg font-bold text-black">The Story</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      Crafted by master perfumers, this exquisite fragrance captures the essence of luxury and sophistication. Each note is carefully selected to create a harmonious blend that evolves beautifully throughout the day.
                    </p>
                  </div>

                  {/* Scent Notes */}
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-black">Scent Notes</h3>
                    
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
                          {tab.charAt(0).toUpperCase() + tab.slice(1)} Notes
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
                      Premium natural ingredients, ethically sourced from around the world. Cruelty-free and vegan-friendly.
                    </p>
                  </div>

                  {/* Best For */}
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-black">Best For</h3>
                    <p className="text-sm text-zinc-600">
                      Evening wear, special occasions, romantic dinners, and making a lasting impression.
                    </p>
                  </div>

                  {/* How to Use */}
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-black">How to Use</h3>
                    <p className="text-sm text-zinc-600">
                      Apply to pulse points: wrists, neck, and behind ears. For best results, apply to moisturized skin. Do not rub after application.
                    </p>
                  </div>
                </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
