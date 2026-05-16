"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

const showcaseImages = {
  wide: "/images/showcase/perfume-showcase-1.jpg",
  large: "/images/showcase/perfume-showcase-2.jpg",
  round: "/images/showcase/perfume-showcase-3.jpg",
  square: "/images/showcase/perfume-showcase-4.jpg",
};

function ImageCard({
  src,
  alt,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
}) {
  return (
    <div className={`relative overflow-hidden border border-[#f7d774]/20 bg-[#11100e] shadow-[0_26px_70px_rgba(0,0,0,0.35),0_0_34px_rgba(212,175,55,0.12)] ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover object-center transition-transform duration-700 hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,240,0.02),rgba(0,0,0,0.18))]" />
    </div>
  );
}

export default function ArtisanPerfumeShowcase() {
  return (
    <section
      role="region"
      aria-label="Elite artisan perfume showcase"
      className="relative -mt-px overflow-hidden bg-[var(--site-bg)] py-10 sm:py-12 lg:py-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--site-bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--site-bg)] to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-[#090b0e] p-5 shadow-[0_28px_80px_rgba(31,26,20,0.22)] sm:p-8 lg:rounded-[2.5rem] lg:p-10">
          <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#d4af37]/12 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-8 h-64 w-64 rounded-full bg-[#f7d774]/10 blur-3xl" />

          <div className="relative grid gap-8 lg:min-h-[680px]">
            <div className="relative z-10">
              <p className="text-sm font-black text-[#fffaf0] sm:text-base">Elite Artisan Perfumes</p>

              <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[1.04] text-[#f7d774] sm:text-5xl lg:text-6xl">
                Experience the Essence
                <span className="block">of Luxury with Every</span>
                <span className="block">Scent</span>
              </h2>

              <p className="mt-4 max-w-md text-xs font-medium leading-6 text-[#fffaf0]/72 lg:absolute lg:left-[52%] lg:top-[152px] lg:mt-0">
                Fine ingredients, timeless elegance, and a signature trail.
              </p>

              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#f7d774]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-5 py-3 text-sm font-bold text-[#1f1a14] shadow-[0_14px_34px_rgba(212,175,55,0.22)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)]"
              >
                Discover More
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="relative z-10 min-h-[430px] sm:min-h-[560px] lg:absolute lg:inset-0 lg:min-h-0">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/10 blur-3xl" />

              <ImageCard
                src={showcaseImages.wide}
                alt="Luxury perfume bottle editorial scene"
                className="absolute right-0 top-0 h-24 w-[76%] rounded-full sm:h-32 sm:w-[58%] lg:right-10 lg:top-0 lg:h-36 lg:w-[32%]"
                sizes="(min-width: 1024px) 32vw, (min-width: 640px) 58vw, 76vw"
              />

              <ImageCard
                src={showcaseImages.large}
                alt="Amber perfume bottle in warm luxury light"
                className="absolute bottom-16 left-0 h-52 w-52 rounded-[45%] sm:h-72 sm:w-72 lg:bottom-80 lg:left-0 lg:h-80 lg:w-80"
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 288px, 208px"
              />

              <ImageCard
                src={showcaseImages.round}
                alt="Premium perfume bottle close-up"
                className="absolute bottom-12 left-[50%] h-48 w-48 -translate-x-1/2 rounded-full sm:h-72 sm:w-72 lg:bottom-72 lg:left-[46%] lg:h-80 lg:w-80"
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 288px, 192px"
              />

              <ImageCard
                src={showcaseImages.square}
                alt="Luxury perfume bottle on champagne background"
                className="absolute bottom-0 right-0 h-56 w-44 rounded-[1.6rem] sm:h-72 sm:w-60 lg:bottom-72 lg:right-0 lg:h-80 lg:w-80 lg:rounded-[2rem]"
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 240px, 176px"
              />
            </div>

            <h3 className="relative z-10 mt-2 text-center text-3xl font-black leading-tight text-[#fffaf0] sm:text-4xl lg:absolute lg:bottom-4 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2">
              Elevate Your <span className="text-[#f7d774]">Fragrance</span>
            </h3>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
