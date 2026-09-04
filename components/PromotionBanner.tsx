"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, Tag, ArrowRight, Clock } from "lucide-react";
import type { Promotion } from "@/lib/firebase/promotions-server";
import type { Product } from "@/lib/firebase/products-server";
import { Timestamp } from "firebase/firestore";
import { useCountdown, formatCountdown } from "@/hooks/useCountdown";

interface EnrichedPromotion extends Promotion {
  product?: Product | null;
}

type PromotionState = "upcoming" | "active" | "expired";

// Countdown Component - must be declared outside to avoid React hooks/static-components rule
function PromotionCountdown({ promotion }: { promotion: Promotion }) {
  const getPromotionState = (promo: Promotion): PromotionState => {
    const now = new Date();
    // Handle both Timestamp objects (if any remain) and ISO strings from API
    const startDate = promo.start_at instanceof Timestamp 
      ? promo.start_at.toDate() 
      : new Date(promo.start_at as unknown as string);
    const endDate = promo.end_at instanceof Timestamp 
      ? promo.end_at.toDate() 
      : new Date(promo.end_at as unknown as string);

    if (now < startDate) return "upcoming";
    if (now > endDate) return "expired";
    return "active";
  };

  const formatDateTime = (date: Date): string => {
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " · " + date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const state = getPromotionState(promotion);
  // Handle both Timestamp objects and ISO strings from API
  const startDate = promotion.start_at instanceof Timestamp 
    ? promotion.start_at.toDate() 
    : new Date(promotion.start_at as unknown as string);
  const endDate = promotion.end_at instanceof Timestamp 
    ? promotion.end_at.toDate() 
    : new Date(promotion.end_at as unknown as string);

  // Use timestamp (number) instead of Date object to prevent infinite re-renders
  // Timestamps are primitive values and won't trigger effect re-runs on every render
  const targetTimestamp = state === "expired" ? null : (state === "upcoming" ? startDate.getTime() : endDate.getTime());
  const timeRemaining = useCountdown(targetTimestamp);

  if (state === "expired") {
    return (
      <div className="rounded-lg bg-[#7a6a55]/10 px-3 py-2 dark:bg-[#b8a892]/10">
        <p className="text-xs font-bold text-[#7a6a55] dark:text-[#b8a892]">
          Promotion ended
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Date Range */}
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#7a6a55] dark:text-[#b8a892]">Starts:</span>
          <span className="text-[#7a6a55] dark:text-[#b8a892]">{formatDateTime(startDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#7a6a55] dark:text-[#b8a892]">Ends:</span>
          <span className="text-[#7a6a55] dark:text-[#b8a892]">{formatDateTime(endDate)}</span>
        </div>
      </div>

      {/* Countdown */}
      {timeRemaining.total > 0 && (
        <div className="w-fit rounded-lg bg-[#d4af37]/10 px-3 py-2 dark:bg-[#d4af37]/20">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#b88700] dark:text-[#d4af37]" />
            <span className="text-xs font-bold text-[#7a6a55] dark:text-[#b8a892]">
              {state === "upcoming" ? "Starts in" : "Ends in"}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm font-black tracking-tight text-[#b88700] dark:text-[#d4af37]">
            {formatCountdown(timeRemaining)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PromotionBanner() {
  const [promotions, setPromotions] = useState<EnrichedPromotion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromotions() {
      try {
        const response = await fetch("/api/promotions/active");
        
        if (!response.ok) {
          console.error("Failed to fetch promotions:", response.status, response.statusText);
          const errorData = await response.json().catch(() => ({}));
          console.error("Error details:", errorData);
          return;
        }

        const result = await response.json();

        if (result.success && result.promotions) {
          setPromotions(result.promotions);
        } else {
          console.error("API returned unsuccessful response:", result);
        }
      } catch (error) {
        console.error("Failed to fetch promotions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPromotions();
  }, []);

  // Auto-rotate promotions every 10 seconds
  useEffect(() => {
    if (promotions.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === promotions.length - 1 ? 0 : prev + 1));
    }, 10000);

    return () => clearInterval(interval);
  }, [promotions.length]);

  if (loading || promotions.length === 0) {
    return null;
  }

  const activePromotion = promotions[activeIndex];

  const getPromotionLabel = (type: string) => {
    return type === "new_product" ? "NEW ARRIVAL" : "LIMITED OFFER";
  };

  // Use product image for new_product type if available
  const displayImage = activePromotion.type === "new_product" && activePromotion.product?.image 
    ? activePromotion.product.image 
    : activePromotion.image;

  const PromotionIcon = activePromotion.type === "new_product" ? Sparkles : Tag;

  return (
    <section className="relative overflow-hidden bg-[var(--site-bg)] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePromotion.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/*
              MODERN ASYMMETRIC SPOTLIGHT
              Clean, editorial-style product feature with asymmetric image placement.
              No cards, no rings, no boxes — just content and product sharing space.
            */}

            {/* ==================== MOBILE (320px-767px) ==================== */}
            <div className="relative mx-auto flex min-h-[380px] max-w-md flex-col md:hidden">
              {/* Subtle ambient glow — blends seamlessly into page background */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_10%,rgba(247,231,179,0.24),transparent)] dark:bg-[radial-gradient(ellipse_70%_45%_at_50%_10%,rgba(212,175,55,0.08),transparent)]"
              />

              {/* Image zone — product emerges from top naturally */}
              {displayImage && (
                <div className="relative z-[1] h-[140px] shrink-0">
                  <div className="flex h-full items-center justify-center overflow-hidden">
                    <img
                      src={displayImage}
                      alt={activePromotion.title}
                      className="h-[90%] w-auto object-contain drop-shadow-[0_12px_20px_rgba(31,26,20,0.16)]"
                      style={{
                        WebkitMaskImage: "linear-gradient(to bottom, #000 30%, transparent 96%)",
                        maskImage: "linear-gradient(to bottom, #000 30%, transparent 96%)",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Content zone */}
              <div className="relative z-[2] flex flex-1 flex-col px-5 py-4 sm:px-6">
                {/* Gold accent line — visual separator */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-[1.5px] w-7 bg-[#d4af37]" aria-hidden="true" />
                  <PromotionIcon className="h-3.5 w-3.5 text-[#d4af37]" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b88700] dark:text-[#d4af37]">
                    {getPromotionLabel(activePromotion.type)}
                  </span>
                </div>

                {/* Title */}
                <h2 className="mb-2 text-[24px] font-black leading-[1.08] tracking-tight text-[#1f1a14] dark:text-[#fff8e7]">
                  {activePromotion.title}
                </h2>

                {/* Description */}
                <p className="mb-3 line-clamp-2 max-w-sm text-[13px] leading-[1.5] text-[#7a6a55] dark:text-[#b8a892]">
                  {activePromotion.description}
                </p>

                {/* Promotion Countdown */}
                <div className="mb-4">
                  <PromotionCountdown promotion={activePromotion} />
                </div>

                {/* Product info (new arrivals only) */}
                {activePromotion.type === "new_product" && activePromotion.product && (
                  <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {activePromotion.product.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#b88700] dark:text-[#d4af37]">
                        {activePromotion.product.brand}
                      </span>
                    )}
                    {activePromotion.product.price && (
                      <span className="text-base font-black text-[#d4af37]">
                        {activePromotion.product.price.toLocaleString()} Ks
                      </span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={activePromotion.cta_url}
                    className="group/btn inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#d4af37,#f0c847)] px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#1f1a14] shadow-[0_6px_18px_-6px_rgba(212,175,55,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(212,175,55,0.5)]"
                  >
                    {activePromotion.cta_text}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                  </Link>

                  {/* Navigation dots */}
                  {promotions.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {promotions.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={`Go to promotion ${index + 1}`}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            index === activeIndex
                              ? "w-5 bg-[#d4af37]"
                              : "w-1 bg-[#d4af37]/25 hover:bg-[#d4af37]/45"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ==================== TABLET / DESKTOP (768px+) ==================== */}
            <div className="relative mx-auto hidden h-[310px] md:block lg:h-[320px]">
              {/* Subtle ambient glow from right side — no box, just atmosphere */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_48%_52%_at_72%_48%,rgba(247,231,179,0.28),transparent)] dark:bg-[radial-gradient(circle_48%_52%_at_72%_48%,rgba(212,175,55,0.09),transparent)]"
              />

              {/* Image — emerges naturally from right edge, no centering */}
              {displayImage && (
                <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] flex w-[52%] items-center justify-end overflow-hidden lg:w-[48%]">
                  <img
                    src={displayImage}
                    alt={activePromotion.title}
                    className="h-[78%] w-auto object-contain drop-shadow-[0_20px_28px_rgba(31,26,20,0.2)] lg:h-[82%]"
                    style={{
                      WebkitMaskImage: "linear-gradient(to right, transparent, #000 22%)",
                      maskImage: "linear-gradient(to right, transparent, #000 22%)",
                    }}
                  />
                </div>
              )}

              {/* Content — left side, asymmetric positioning */}
              <div className="relative z-[2] flex h-full max-w-[52%] flex-col justify-center pl-6 pr-3 lg:max-w-[50%] lg:pl-8">
                {/* Gold accent line — simple separator */}
                <div className="mb-4 flex items-center gap-2.5 lg:mb-4">
                  <span className="h-[2px] w-9 bg-[#d4af37]" aria-hidden="true" />
                  <PromotionIcon className="h-4 w-4 text-[#d4af37]" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b88700] dark:text-[#d4af37] lg:text-[11px]">
                    {getPromotionLabel(activePromotion.type)}
                  </span>
                </div>

                {/* Title */}
                <h2 className="mb-3 text-[30px] font-black leading-[1.06] tracking-tight text-[#1f1a14] dark:text-[#fff8e7] lg:mb-3.5 lg:text-[34px]">
                  {activePromotion.title}
                </h2>

                {/* Description */}
                <p className="mb-4 max-w-md text-[13.5px] leading-[1.55] text-[#7a6a55] dark:text-[#b8a892] lg:mb-4 lg:text-sm">
                  {activePromotion.description}
                </p>

                {/* Promotion Countdown */}
                <div className="mb-4 lg:mb-4">
                  <PromotionCountdown promotion={activePromotion} />
                </div>

                {/* Product info (new arrivals only) */}
                {activePromotion.type === "new_product" && activePromotion.product && (
                  <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 lg:mb-4">
                    {activePromotion.product.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#b88700] dark:text-[#d4af37] lg:text-[11px]">
                        {activePromotion.product.brand}
                      </span>
                    )}
                    {activePromotion.product.price && (
                      <span className="text-lg font-black text-[#d4af37] lg:text-xl">
                        {activePromotion.product.price.toLocaleString()} Ks
                      </span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-3.5">
                  <Link
                    href={activePromotion.cta_url}
                    className="group/btn inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#d4af37,#f0c847)] px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-[#1f1a14] shadow-[0_6px_18px_-6px_rgba(212,175,55,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(212,175,55,0.5)] lg:px-7 lg:py-3"
                  >
                    {activePromotion.cta_text}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5 lg:h-4 lg:w-4" />
                  </Link>

                  {/* Navigation dots */}
                  {promotions.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {promotions.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={`Go to promotion ${index + 1}`}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            index === activeIndex
                              ? "w-5 bg-[#d4af37]"
                              : "w-1 bg-[#d4af37]/25 hover:bg-[#d4af37]/45"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
