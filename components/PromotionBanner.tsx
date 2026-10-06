"use client";
import devLog from "@/lib/dev-log";


import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, Tag, ArrowRight, Clock } from "lucide-react";
import type { Promotion, ProductPromotion } from "@/lib/types/promotions";
import type { Product } from "@/lib/types/products";
import { Timestamp } from "firebase/firestore";
import { useCountdown, formatCountdown } from "@/hooks/useCountdown";
import { BUSINESS_TIME_ZONE } from "@/lib/business-schedule";
import { ANNOUNCEMENT_LABELS, formatArrivalDate } from "@/lib/announcements";
import type { PublicAnnouncement } from "@/lib/types/announcements";

interface EnrichedPromotion extends Promotion {
  product?: Product | null;
  promotion_price: number;
}

type HomepageItem =
  | { kind: "promotion"; data: EnrichedPromotion }
  | { kind: "announcement"; data: PublicAnnouncement };

type ProductPromotionResponse = ProductPromotion & { product: Product & { image?: string } };

class HomepageLoadError extends Error {}

async function fetchHomepageJson(endpoint: string): Promise<Record<string, unknown>> {
  let response: Response;
  try { response = await fetch(endpoint); }
  catch { throw new HomepageLoadError("Network request failed."); }
  let result: unknown;
  try { result = await response.json(); }
  catch { throw new HomepageLoadError(`HTTP ${response.status}: Expected a JSON response.`); }
  if (!response.ok) {
    // These APIs serialize curated public errors. Never log HTML or raw exceptions.
    const message = result && typeof result === "object" && "error" in result &&
      typeof result.error === "string" && result.error.length <= 300 ? result.error : "Request rejected.";
    throw new HomepageLoadError(`HTTP ${response.status}: ${message}`);
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new HomepageLoadError(`HTTP ${response.status}: Invalid JSON response.`);
  }
  return result as Record<string, unknown>;
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

  const formatDate = (date: Date): string => {
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return date.toLocaleDateString("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
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
          <span className="text-muted ">{formatDate(startDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-muted ">Ends:</span>
          <span className="text-muted ">{formatDate(endDate)}</span>
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
  const [promotions, setPromotions] = useState<HomepageItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProductPromotions(): Promise<HomepageItem[]> {
      const result = await fetchHomepageJson("/api/product-promotions/active");
      if (result.success !== true || !Array.isArray(result.promotions)) throw new HomepageLoadError("Invalid promotions response.");
      return result.promotions.map((promo: ProductPromotionResponse) => ({
        kind: "promotion" as const,
        data: {
          id: promo.id, type: "promotion" as const,
          title: promo.product?.name || "Special Offer",
          description: `Save ${Math.round(((promo.product?.price - promo.promotion_price) / promo.product?.price) * 100)}% on this product!`,
          image: promo.product?.image, imageFileId: null,
          cta_text: "Shop Now", cta_url: `/products/${promo.product_id}`,
          product_id: promo.product_id, is_active: promo.is_active,
          start_at: promo.start_at, end_at: promo.end_at,
          created_at: promo.created_at, updated_at: promo.updated_at,
          product: promo.product, promotion_price: promo.promotion_price,
        },
      }));
    }
    async function loadAnnouncements(): Promise<HomepageItem[]> {
      const result = await fetchHomepageJson("/api/announcements/active");
      if (result.success !== true || !Array.isArray(result.announcements)) throw new HomepageLoadError("Invalid announcements response.");
      return result.announcements.map((announcement: PublicAnnouncement) => ({ kind: "announcement" as const, data: announcement }));
    }
    async function loadHomepageItems() {
      const results = await Promise.allSettled([loadProductPromotions(), loadAnnouncements()]);
      const items: HomepageItem[] = [];
      for (const [index, result] of results.entries()) {
        if (result.status === "fulfilled") items.push(...result.value);
        else {
          const source = index === 0 ? "Product promotions (/api/product-promotions/active)" : "Announcements (/api/announcements/active)";
          const message = result.reason instanceof HomepageLoadError ? result.reason.message : "Unexpected response.";
          devLog.error(`${source} load failed: ${message}`);
        }
      }
      setPromotions(items);
      setLoading(false);
    }
    loadHomepageItems();
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

  const activeItem = promotions[activeIndex];
  const activePromotion = activeItem.data;
  const productPromotion = activeItem.kind === "promotion" ? activeItem.data : null;
  const announcement = activeItem.kind === "announcement" ? activeItem.data : null;
  const label = announcement ? ANNOUNCEMENT_LABELS[announcement.announcement_type] : "LIMITED OFFER";
  const displayImage = productPromotion?.product?.images?.length
    ? productPromotion.product.images[0] : activePromotion.image;
  const PromotionIcon = announcement ? Sparkles : Tag;

  return (
    <section className="studio-promotion relative overflow-hidden bg-[var(--site-bg)] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeItem.kind}:${activePromotion.id}`}
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
                    {label}
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
                  {announcement ? (
                    <p className="text-xs text-muted">
                      {announcement.announcement_type === "coming_soon" ? "Arriving" : "Available"} {formatArrivalDate(announcement.arrival_date)}
                    </p>
                  ) : productPromotion && <PromotionCountdown promotion={productPromotion} />}
                </div>

                {/* Product promotion details */}
                {productPromotion?.product && (
                  <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {productPromotion.product.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent ">
                        {productPromotion.product.brand}
                      </span>
                    )}
                    {productPromotion.product.price && (
                      <span className="text-base font-semibold text-accent">
                        {productPromotion.promotion_price.toLocaleString()} Ks
                      </span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-3">
                  {activePromotion.cta_url && activePromotion.cta_text && <Link
                    href={activePromotion.cta_url}
                    className="group/btn inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-xs font-bold uppercase tracking-wide text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:shadow-panel"
                  >
                    {activePromotion.cta_text}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                  </Link>}

                  {/* Navigation dots */}
                  {promotions.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {promotions.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={`Go to offer or announcement ${index + 1}`}
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
                    {label}
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
                  {announcement ? (
                    <p className="text-xs text-muted">
                      {announcement.announcement_type === "coming_soon" ? "Arriving" : "Available"} {formatArrivalDate(announcement.arrival_date)}
                    </p>
                  ) : productPromotion && <PromotionCountdown promotion={productPromotion} />}
                </div>

                {/* Product promotion details */}
                {productPromotion?.product && (
                  <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 lg:mb-4">
                    {productPromotion.product.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent  lg:text-[11px]">
                        {productPromotion.product.brand}
                      </span>
                    )}
                    {productPromotion.product.price && (
                      <span className="text-lg font-semibold text-accent lg:text-xl">
                        {productPromotion.promotion_price.toLocaleString()} Ks
                      </span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-3.5">
                  {activePromotion.cta_url && activePromotion.cta_text && <Link
                    href={activePromotion.cta_url}
                    className="group/btn inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:shadow-panel lg:px-7 lg:py-3"
                  >
                    {activePromotion.cta_text}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5 lg:h-4 lg:w-4" />
                  </Link>}

                  {/* Navigation dots */}
                  {promotions.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {promotions.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={`Go to offer or announcement ${index + 1}`}
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
