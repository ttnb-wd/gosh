"use client";

import { ArrowRight, Diamond, Gem, Sparkles, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const heroInfo = [
  {
    icon: Diamond,
    title: "BEYOND LUXURY",
    text: "Crafted to evoke emotion, designed to leave a lasting impression.",
  },
  {
    icon: Sparkles,
    title: "GOLDEN ESSENCE COLLECTION",
    text: "A radiant expression of timeless elegance and refined craftsmanship.",
  },
];

export default function Hero() {
  return (
    <section
      role="region"
      aria-label="Hero banner"
      id="home"
      className="relative isolate -mt-px overflow-hidden bg-[radial-gradient(circle_at_78%_28%,rgba(247,231,179,0.78),transparent_30%),radial-gradient(circle_at_8%_12%,rgba(255,255,255,0.96),transparent_36%),linear-gradient(135deg,#fffaf0_0%,#fff7e6_48%,#f3dfb2_100%)] px-0 pb-6 pt-0 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-80"
        aria-hidden="true"
      >
      </div>

      {/* Hero Image - Absolute positioned to blend into background - Hidden on mobile, visible on tablet+ */}
      <div className="pointer-events-none absolute top-0 bottom-0 right-0 z-[1] hidden w-[65%] overflow-hidden sm:block lg:block">
        <Image
          src="/images/hero/perfumebottle (2).png"
          alt="GOSH Perfume Studio golden perfume bottle with jasmine flowers and gold ribbon"
          fill
          priority
          sizes="65vw"
          className="object-contain opacity-100"
          style={{ objectFit: 'contain', objectPosition: 'right top' }}
          fetchPriority="high"
        />
        {/* Left fade overlay - minimal blend on edge only */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-48 bg-gradient-to-r from-[#fffaf0] via-[#fffaf0]/40 to-transparent" />
        {/* Top fade overlay - minimal blend on edge only */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#fffaf0] via-[#fffaf0]/30 to-transparent" />
        {/* Bottom fade overlay - constrained to image area only, stops before feature card */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[#fbf6ed] via-[#fbf6ed]/60 to-transparent sm:h-40 lg:h-48" />
      </div>

      {/* Gradient overlay for text readability - Hidden on mobile, visible on tablet+ */}
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-[2] hidden w-[50%] bg-gradient-to-r from-[#fffaf0] via-[#fffaf0]/80 to-transparent sm:block lg:block" />

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center pt-0 pb-0 sm:pt-6 sm:pb-12 lg:grid-cols-[40%_60%] lg:pt-8 lg:pb-16 px-0 sm:px-6 lg:px-8">
            {/* Mobile: Content area with background image | Desktop: Normal content */}
            <div className="relative w-full mx-0 px-0 py-4 pb-4 mb-0 sm:static sm:max-w-2xl sm:mx-auto sm:px-0 sm:py-0 sm:pb-0 sm:mb-0 text-center sm:text-left">
              
              {/* Mobile-only background inside content area only */}
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden sm:hidden">
                <Image
                  src="/images/hero/perfumebottle (2).png"
                  alt="Perfume bottle background"
                  fill
                  priority
                  className="object-cover object-center opacity-50"
                />
                <div className="absolute inset-0 bg-white/20" />
              </div>

              {/* Mobile readability overlay */}
              <div className="absolute inset-0 z-[1] sm:hidden bg-white/30 pointer-events-none" />

              {/* Content - Above background */}
              <div className="relative z-10 px-5 sm:px-0">
                <h1 className="font-serif text-[clamp(3.1rem,12vw,5rem)] leading-[0.98] tracking-tight text-[#15120f] sm:text-[clamp(4.3rem,8vw,6.8rem)] lg:text-[clamp(4.7rem,6.8vw,7.25rem)]">
                  <span className="block whitespace-nowrap">The Essence</span>
                  <span className="block whitespace-nowrap">
                    of{" "}
                    <span className="bg-[linear-gradient(135deg,#b88700,#d4af37,#8d5f00)] bg-clip-text text-transparent">
                      Elegance
                    </span>
                  </span>
                </h1>

                <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-3 sm:mx-0 sm:justify-start">
                  <span className="h-px flex-1 bg-[#d4af37]/60" />
                  <span className="h-2.5 w-2.5 rotate-45 bg-[#d4af37]" />
                  <span className="h-px flex-1 bg-[#d4af37]/60" />
                </div>

                <p className="mx-auto mt-7 max-w-xl text-base font-medium leading-7 text-black/85 drop-shadow-[0_1px_6px_rgba(255,255,255,0.9)] sm:mx-0 sm:text-lg sm:leading-8 sm:text-[#4f4234] sm:drop-shadow-none">
                  Experience premium perfumes crafted with style, depth, and luxury.
                  A modern perfume brand with clean elegance and golden highlights.
                </p>

                <div className="mt-8 flex flex-row items-center justify-center gap-2 px-2 sm:justify-start sm:gap-4 sm:px-0">
                  <Link href="/products">
                    <button className="group inline-flex h-11 min-w-[110px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-3 text-xs font-bold text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.22)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)] hover:shadow-[0_16px_40px_rgba(212,175,55,0.32)] active:scale-95 sm:h-auto sm:min-w-0 sm:gap-3 sm:px-8 sm:py-4 sm:text-base sm:text-lg">
                      Shop Now
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1 sm:h-5 sm:w-5" />
                    </button>
                  </Link>

                  <Link href="/products">
                    <button className="h-11 min-w-[140px] whitespace-nowrap rounded-full bg-[#1f1a14] px-3 text-xs font-bold text-white shadow-[0_12px_28px_rgba(31,26,20,0.18)] transition hover:-translate-y-0.5 hover:bg-[#2a2018] sm:h-auto sm:min-w-0 sm:px-8 sm:py-4 sm:text-base sm:text-lg">
                      Explore Collection
                    </button>
                  </Link>
                </div>
              </div>
            </div>
            </div>

            {/* Mobile Image - Hidden */}
            <div className="relative hidden">
              <Image
                src="/images/hero/perfumebottle (2).png"
                alt="GOSH Perfume Studio golden perfume bottle with jasmine flowers and gold ribbon"
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-contain object-center"
              />
            </div>
          </div>
        </div>

        {/* Premium Feature Card - Overlapping Hero - Above all gradients */}
        <div className="relative z-30 mt-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-0 mx-0 sm:mt-5 lg:mt-6">
          <div className="w-full overflow-hidden rounded-3xl border-y border-[#d4af37]/30 bg-[#fffef9] shadow-[0_8px_32px_rgba(212,175,55,0.08)]">
            <div className="grid gap-0 divide-y divide-[#d4af37]/15 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {/* Column 1: Beyond Luxury */}
            <div className="flex gap-5 p-7 sm:gap-6 sm:p-8 lg:gap-7 lg:p-10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37]/40 bg-[#fffaf0] text-[#b88700] sm:h-12 sm:w-12">
                <Diamond className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#b88700] sm:text-sm">
                  BEYOND LUXURY
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#4f4234] sm:mt-2.5 sm:text-base sm:leading-relaxed">
                  Crafted to evoke emotion, designed to leave a lasting impression.
                </p>
              </div>
            </div>

            {/* Column 2: Golden Essence Collection */}
            <div className="flex gap-5 p-7 sm:gap-6 sm:p-8 lg:gap-7 lg:p-10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37]/40 bg-[#fffaf0] text-[#b88700] sm:h-12 sm:w-12">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#b88700] sm:text-sm">
                  GOLDEN ESSENCE COLLECTION
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#4f4234] sm:mt-2.5 sm:text-base sm:leading-relaxed">
                  A radiant expression of timeless elegance and refined craftsmanship.
                </p>
              </div>
            </div>

            {/* Column 3: Discover Scents */}
            <div className="flex gap-5 p-7 sm:gap-6 sm:p-8 lg:gap-7 lg:p-10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37]/40 bg-[#fffaf0] text-[#b88700] sm:h-12 sm:w-12">
                <Gem className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-black leading-tight text-[#1f1a14] sm:text-base sm:leading-tight">
                  Discover scents that define you.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#4f4234] sm:mt-2.5 sm:text-base sm:leading-relaxed">
                  Explore our signature collection today.
                </p>
                <Link
                  href="/products"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#b88700] transition hover:gap-3 hover:text-[#8d5f00] sm:mt-3.5 sm:text-base"
                >
                  Explore More
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section fade - only affects area below feature card */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-[5] h-24 bg-[linear-gradient(to_bottom,rgba(251,246,237,0)_0%,rgba(251,246,237,0.3)_50%,rgba(251,246,237,1)_100%)]"
        aria-hidden="true"
      />
    </section>
  );
}
