"use client";
import devLog from "@/lib/dev-log";


import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, Tag, ArrowRight, Clock } from "lucide-react";
import type { Promotion } from "@/lib/types/promotions";
import type { Product } from "@/lib/types/products";
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
      <div className="rounded-lg bg-surface-muted/10 px-3 py-2 ">
        <p className="text-xs font-bold text-muted ">
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
          <span className="font-bold text-muted ">Starts:</span>
          <span className="text-muted ">{formatDateTime(startDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-muted ">Ends:</span>
          <span className="text-muted ">{formatDateTime(endDate)}</span>
        </div>
      </div>

      {/* Countdown */}
      {timeRemaining.total > 0 && (
        <div className="w-fit rounded-lg bg-brand-soft px-3 py-2 ">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-accent " />
            <span className="text-xs font-bold text-muted ">
              {state === "upcoming" ? "Starts in" : "Ends in"}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm font-semibold tracking-tight text-accent ">
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
        // Use unified endpoint to get both banner and product promotions
        const response = await fetch("/api/promotions/unified");

        if (!response.ok) {
          devLog.error("Failed to fetch promotions:", response.status, response.statusText);
          const errorData = await response.json().catch(() => ({}));
          devLog.error("Error details:", errorData);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Combine banner promotions and product promotions
          const allPromotions: EnrichedPromotion[] = [
            ...result.data.bannerPromotions,
            // Convert product promotions to banner format
            ...result.data.productPromotions.map((promo: {
              id: string; product_id: string; promotion_price: number; is_active: boolean;
              start_at: Timestamp; end_at: Timestamp; created_at: Timestamp; updated_at: Timestamp;
              product: Product & { image?: string };
            }) => ({
              id: promo.id,
              type: 'new_product' as const,
              title: promo.product?.name || 'Special Offer',
              description: `Save ${Math.round(((promo.product?.price - promo.promotion_price) / promo.product?.price) * 100)}% on this product!`,
              image: promo.product?.image,
              imageFileId: null,
              cta_text: 'Shop Now',
              cta_url: `/products/${promo.product_id}`,
              product_id: promo.product_id,
              is_active: promo.is_active,
              start_at: promo.start_at,
              end_at: promo.end_at,
              created_at: promo.created_at,
              updated_at: promo.updated_at,
              product: promo.product,
            })),
          ];

          setPromotions(allPromotions);
        } else {
          devLog.error("API returned unsuccessful response:", result);
        }
      } catch (error) {
        devLog.error("Failed to fetch promotions:", error);
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
      if (document.hidden) return;
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
  const displayImage = activePromotion.type === "new_product" && activePromotion.product?.images && activePromotion.product.images.length > 0
    ? activePromotion.product.images[0]
    : activePromotion.image;

  const PromotionIcon = activePromotion.type === "new_product" ? Sparkles : Tag;

  return (
    <section className="studio-promotion relative overflow-hidden bg-[var(--site-bg)] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
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
                className="pointer-events-none absolute inset-0 bg-surface-muted "
              />

              {/* Image zone — product emerges from top naturally */}
              {displayImage && (
                <div className="relative z-[1] h-[140px] shrink-0">
                  <div className="flex h-full items-center justify-center overflow-hidden">
                    <img
                      src={displayImage}
                      alt={activePromotion.title}
                      className="h-[90%] w-auto object-contain"
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
                  <span className="h-[1.5px] w-7 bg-brand" aria-hidden="true" />
                  <PromotionIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent ">
                    {getPromotionLabel(activePromotion.type)}
                  </span>
                </div>

                {/* Title */}
                <h2 className="studio-display studio-gradient mb-2 text-[24px] font-semibold leading-[1.08] tracking-tight text-ink ">
                  {activePromotion.title}
                </h2>

                {/* Description */}
                <p className="mb-3 line-clamp-2 max-w-sm text-[13px] leading-[1.5] text-muted ">
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent ">
                        {activePromotion.product.brand}
                      </span>
                    )}
                    {activePromotion.product.price && (
                      <span className="text-base font-semibold text-accent">
                        {activePromotion.product.price.toLocaleString()} Ks
                      </span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={activePromotion.cta_url}
                    className="group/btn inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-xs font-bold uppercase tracking-wide text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:shadow-panel"
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
                              ? "w-5 bg-brand"
                              : "w-1 bg-brand-soft hover:bg-brand/45"
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
                className="pointer-events-none absolute inset-0 bg-surface-muted "
              />

              {/* Image — emerges naturally from right edge, no centering */}
              {displayImage && (
                <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] flex w-[52%] items-center justify-end overflow-hidden lg:w-[48%]">
                  <img
                    src={displayImage}
                    alt={activePromotion.title}
                    className="h-[78%] w-auto object-contain lg:h-[82%]"
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
                  <span className="h-[2px] w-9 bg-brand" aria-hidden="true" />
                  <PromotionIcon className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent  lg:text-[11px]">
                    {getPromotionLabel(activePromotion.type)}
                  </span>
                </div>

                {/* Title */}
                <h2 className="studio-display studio-gradient mb-3 text-[30px] font-semibold leading-[1.06] tracking-tight text-ink  lg:mb-3.5 lg:text-[34px]">
                  {activePromotion.title}
                </h2>

                {/* Description */}
                <p className="mb-4 max-w-md text-[13.5px] leading-[1.55] text-muted  lg:mb-4 lg:text-sm">
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent  lg:text-[11px]">
                        {activePromotion.product.brand}
                      </span>
                    )}
                    {activePromotion.product.price && (
                      <span className="text-lg font-semibold text-accent lg:text-xl">
                        {activePromotion.product.price.toLocaleString()} Ks
                      </span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-3.5">
                  <Link
                    href={activePromotion.cta_url}
                    className="group/btn inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:shadow-panel lg:px-7 lg:py-3"
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
                              ? "w-5 bg-brand"
                              : "w-1 bg-brand-soft hover:bg-brand/45"
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
