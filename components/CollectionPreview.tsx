"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { SCENT_COLLECTIONS, type ScentCollection } from "@/lib/collections";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Flower2,
  Gem,
  Leaf,
  MoonStar,
  Sparkles,
  SunMedium,
  Trees,
  Waves,
  Wind,
} from "lucide-react";

const collectionDetails: Record<
  ScentCollection,
  {
    description: string;
    accent: string;
    image: string;
    icon: typeof Wind;
  }
> = {
  Fresh: {
    description: "Clean, airy and everyday elegant.",
    accent: "Fresh luxury",
    image:
      "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=900&auto=format&fit=crop&q=80",
    icon: Wind,
  },
  Woody: {
    description: "Warm woods with confident depth.",
    accent: "Deep elegance",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&auto=format&fit=crop&q=80",
    icon: Trees,
  },
  Floral: {
    description: "Soft petals with timeless charm.",
    accent: "Romantic notes",
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=900&auto=format&fit=crop&q=80",
    icon: Flower2,
  },
  Oriental: {
    description: "Rich, warm and mysterious.",
    accent: "Evening luxury",
    image:
      "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=900&auto=format&fit=crop&q=80",
    icon: MoonStar,
  },
  Citrus: {
    description: "Bright, sparkling and energetic.",
    accent: "Fresh sparkle",
    image:
      "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=900&auto=format&fit=crop&q=80",
    icon: SunMedium,
  },
  Aquatic: {
    description: "Cool, clean and ocean-inspired.",
    accent: "Clean breeze",
    image:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=900&auto=format&fit=crop&q=80",
    icon: Waves,
  },
  Sweet: {
    description: "Soft sweetness with addictive warmth.",
    accent: "Soft charm",
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=900&auto=format&fit=crop&q=80",
    icon: Sparkles,
  },
  Oud: {
    description: "Bold, royal and long-lasting.",
    accent: "Royal depth",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&auto=format&fit=crop&q=80",
    icon: Gem,
  },
  Musk: {
    description: "Clean skin-like sensual softness.",
    accent: "Soft luxury",
    image:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=900&auto=format&fit=crop&q=80",
    icon: Droplets,
  },
  Amber: {
    description: "Golden warmth and smooth richness.",
    accent: "Golden warmth",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&auto=format&fit=crop&q=80",
    icon: Leaf,
  },
  Spicy: {
    description: "Warm spices with powerful character.",
    accent: "Bold energy",
    image:
      "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=900&auto=format&fit=crop&q=80",
    icon: Flame,
  },
};

const collections = SCENT_COLLECTIONS.map((name) => ({
  name,
  ...collectionDetails[name],
}));

const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 42 : -42,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -42 : 42,
    scale: 0.98,
  }),
};

export default function CollectionPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const activeCollection = collections[activeIndex];
  const ActiveIcon = activeCollection.icon;

  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev === 0 ? collections.length - 1 : prev - 1));
  };

  const goNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev === collections.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="overflow-hidden bg-[var(--site-bg)] px-3 pb-0 pt-0 sm:px-4 sm:pt-2 md:px-6 lg:px-8 lg:pt-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="sr-only"
        >
          <h2 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Curated Fragrance Collections
          </h2>
        </motion.div>

        <div className="relative">

          <div className="relative overflow-hidden rounded-xl border border-line bg-surface/85  sm:rounded-xl md:rounded-xl lg:rounded-xl">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeCollection.name}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative grid min-h-0 gap-3 p-3 pb-14 sm:gap-4 sm:p-4 sm:pb-16 md:gap-5 md:p-5 md:pb-20 lg:min-h-[370px] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8 lg:p-8"
              >
                <span className="pointer-events-none absolute -left-2 bottom-[-6px] z-0 select-none text-[2.5rem] font-semibold uppercase leading-none tracking-tight text-accent/10 sm:-left-4 sm:bottom-[-8px] sm:text-[3rem] md:bottom-[-14px] md:text-[4.8rem] lg:left-6 lg:bottom-[-26px] lg:text-[8rem]">
                  {activeCollection.name}
                </span>

                <div className="relative z-10 flex h-full flex-col justify-center">
                  <p className="mb-2 max-w-full text-[clamp(1.5rem,7vw,2.5rem)] font-semibold leading-[0.95] text-accent sm:mb-2 sm:text-[clamp(1.75rem,6vw,2.5rem)] md:mb-3 md:text-[clamp(2.25rem,5vw,3.2rem)] lg:max-w-[620px] lg:text-[clamp(2.8rem,4vw,3.6rem)]">
                    Curated Collections
                  </p>
                  <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-accent shadow-panel sm:mb-3 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-[0.2em] md:mb-4 md:px-4 md:py-2 md:text-[11px] md:tracking-[0.26em] lg:mb-5">
                    <ActiveIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    {activeCollection.accent}
                  </div>
                  <h3 className="text-xl font-semibold leading-none text-ink sm:text-2xl md:text-3xl lg:text-5xl">
                    {activeCollection.name}
                  </h3>
                  <p className="mt-2 max-w-xl text-xs leading-4 text-muted sm:mt-2 sm:text-xs sm:leading-5 md:mt-3 md:text-sm md:leading-6 lg:mt-4 lg:text-base lg:leading-7">
                    {activeCollection.description}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3 sm:gap-3 md:mt-4 md:gap-4 lg:mt-6">
                    <Link
                      href={`/products?collection=${encodeURIComponent(activeCollection.name)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-brand px-3 py-1.5 text-xs font-bold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:shadow-panel sm:gap-2 sm:px-4 sm:py-2 sm:text-xs md:px-5 md:py-2.5 md:text-sm lg:gap-3 lg:px-6 lg:py-2.5"
                    >
                      Explore
                      <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Link>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted sm:gap-2 sm:text-xs md:text-sm">
                      <span className="h-px w-6 bg-brand-soft sm:w-8 md:w-10" />
                      {String(activeIndex + 1).padStart(2, "0")} /{" "}
                      {String(collections.length).padStart(2, "0")}
                    </div>
                  </div>

                  <div className="mt-4 hidden items-center gap-2 sm:mt-5 md:gap-3 lg:mt-6 lg:flex">
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Previous collection"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/90 text-accent shadow-panel  transition-all duration-300 hover:bg-surface hover:shadow-panel"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Next collection"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/90 text-accent shadow-panel  transition-all duration-300 hover:bg-surface hover:shadow-panel"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10 flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-xl bg-surface shadow-panel max-sm:aspect-[4/3] sm:rounded-xl md:rounded-xl lg:rounded-xl">
                  <div className="absolute inset-0 bg-surface-muted" />
                  <img
                    src={activeCollection.image}
                    alt={`${activeCollection.name} collection`}
                    className="h-full w-full scale-[1.08] object-cover object-center transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-surface-muted" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2 sm:bottom-4 sm:gap-3 md:bottom-5 md:gap-4 lg:hidden">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous collection"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-accent shadow-panel  transition-all duration-300 hover:bg-surface sm:h-10 sm:w-10 md:h-11 md:w-11"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next collection"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-accent shadow-panel  transition-all duration-300 hover:bg-surface sm:h-10 sm:w-10 md:h-11 md:w-11"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
