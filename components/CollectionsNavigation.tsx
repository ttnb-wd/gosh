"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Droplets, Flame, Flower2, Gem, Leaf, MoonStar, Sparkles, SunMedium, Trees, Waves, Wind } from "lucide-react";
import type { ScentCollection } from "@/lib/collections";

const collectionData: Record<
  ScentCollection,
  {
    icon: typeof Wind;
    accent: string;
  }
> = {
  Fresh: { icon: Wind, accent: "Clean & Airy" },
  Woody: { icon: Trees, accent: "Warm & Deep" },
  Floral: { icon: Flower2, accent: "Soft & Romantic" },
  Oriental: { icon: MoonStar, accent: "Rich & Mysterious" },
  Citrus: { icon: SunMedium, accent: "Bright & Energetic" },
  Aquatic: { icon: Waves, accent: "Cool & Fresh" },
  Sweet: { icon: Sparkles, accent: "Soft & Warm" },
  Oud: { icon: Gem, accent: "Bold & Royal" },
  Musk: { icon: Droplets, accent: "Sensual & Clean" },
  Amber: { icon: Leaf, accent: "Golden & Rich" },
  Spicy: { icon: Flame, accent: "Powerful & Warm" },
};

const collections: ScentCollection[] = [
  "Fresh",
  "Woody",
  "Floral",
  "Oriental",
  "Citrus",
  "Aquatic",
  "Sweet",
  "Oud",
];

// Collection Card Component (extracted for reuse)
const CollectionCard = ({ name, index }: { name: ScentCollection; index: number }) => {
  const collection = collectionData[name];
  const Icon = collection.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
    >
      <Link
        href={`/products?collection=${encodeURIComponent(name)}`}
        className="group block"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/15 bg-[#fbf6ed]/60 px-5 py-6 backdrop-blur transition-all duration-300 hover:border-[#d4af37]/35 hover:bg-[#fbf6ed] hover:shadow-[0_8px_24px_rgba(212,175,55,0.12)] dark:border-[#d4af37]/10 dark:bg-[#15100b]/40 dark:hover:border-[#d4af37]/25 dark:hover:bg-[#15100b]/70 sm:px-6 sm:py-7">
          {/* Icon */}
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#fff7e6]/80 text-[#d4af37] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#d4af37] group-hover:text-[#1f1a14] dark:bg-[#1c160f]/80 dark:group-hover:bg-[#d4af37] sm:mb-4 sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          {/* Collection name */}
          <h3 className="mb-1 text-lg font-black leading-tight text-[#1f1a14] dark:text-[#fff7e6] sm:text-xl">
            {name}
          </h3>

          {/* Accent description */}
          <p className="mb-2 text-xs leading-snug text-[#7a6a55] dark:text-[#b8a892] sm:text-sm">
            {collection.accent}
          </p>

          {/* Arrow icon */}
          <div className="flex items-center gap-1 text-[#b88700] opacity-0 transition-all duration-300 group-hover:gap-2 group-hover:opacity-100 dark:text-[#d4af37]">
            <span className="text-xs font-bold uppercase tracking-wide">Explore</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default function CollectionsNavigation() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? collections.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === collections.length - 1 ? 0 : prev + 1));
  };

  return (
    <section 
      role="region" 
      aria-label="Shop by collection" 
      className="bg-[var(--site-bg)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 text-center sm:mb-10 lg:mb-12"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b88700] sm:text-sm">
            Discover Your Scent
          </p>
          <h2 className="text-[clamp(1.75rem,4.5vw,2.5rem)] font-black leading-[1.1] text-[#1f1a14] dark:text-[#fff7e6]">
            Shop by Collection
          </h2>
        </motion.div>

        {/* Mobile Carousel - visible only on mobile */}
        <div className="flex items-center justify-center gap-3 sm:hidden">
          {/* Left Arrow */}
          <button
            onClick={handlePrevious}
            aria-label="Previous collection"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#fbf6ed]/80 text-[#d4af37] transition-all hover:border-[#d4af37]/40 hover:bg-[#fbf6ed] hover:shadow-md active:scale-95 dark:border-[#d4af37]/15 dark:bg-[#15100b]/60 dark:hover:border-[#d4af37]/30 dark:hover:bg-[#15100b]/80"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Current Collection Card */}
          <div className="w-full max-w-[280px] flex-shrink">
            <CollectionCard 
              name={collections[currentIndex]} 
              index={currentIndex} 
            />
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            aria-label="Next collection"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#fbf6ed]/80 text-[#d4af37] transition-all hover:border-[#d4af37]/40 hover:bg-[#fbf6ed] hover:shadow-md active:scale-95 dark:border-[#d4af37]/15 dark:bg-[#15100b]/60 dark:hover:border-[#d4af37]/30 dark:hover:bg-[#15100b]/80"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop/Tablet Grid - hidden on mobile */}
        <div className="hidden grid-cols-2 gap-3 sm:grid sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {collections.map((name, index) => (
            <CollectionCard key={name} name={name} index={index} />
          ))}
        </div>

        {/* View all link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 text-center sm:mt-10"
        >
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#b88700] transition hover:gap-3 hover:text-[#8d5f00] dark:text-[#d4af37] dark:hover:text-[#f0c847]"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
