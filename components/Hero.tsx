"use client";

import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LuxuryHeroEffects from "@/components/LuxuryHeroEffects";

export default function Hero() {
  return (
    <section
      role="region"
      aria-label="Hero banner"
      id="home"
      className="relative isolate -mt-px min-h-[560px] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(111,29,27,0.14),transparent_42%),linear-gradient(135deg,#fffaf0_0%,#f8eeee_48%,#ffffff_100%)] px-4 pb-16 pt-0 sm:px-6 lg:px-8 lg:pb-20 lg:pt-0"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[58%] [mask-image:linear-gradient(90deg,transparent_0%,black_14%,black_100%)] md:block"
        aria-hidden="true"
      >
        <Image
          src="/images/hero/wmremove-transformed.png"
          alt=""
          fill
          priority
          sizes="58vw"
          className="object-cover object-[48%_center]"
        />
      </div>

      <div className="pointer-events-none absolute right-[19%] top-[8%] z-10 hidden h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(247,231,179,0.72)_0%,rgba(212,175,55,0.24)_42%,transparent_72%)] blur-2xl md:block" />

      <LuxuryHeroEffects />

      <div className="mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-30 pt-12 lg:pt-12"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6f1d1b]/20 bg-[#f8eeee] px-4 py-2 text-sm text-[#6f1d1b] shadow-[0_10px_24px_rgba(212,175,55,0.12)]"
          >
            <Star className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" />
            Premium Luxury Perfume
          </motion.div>

          <motion.h1 className="max-w-2xl text-4xl font-black leading-none text-[#1f1a14] sm:text-5xl lg:text-6xl">
            Discover the
            <span className="mt-3 block whitespace-nowrap text-[#b88705]">
              Scent of Elegance
            </span>
          </motion.h1>

          <motion.p className="mt-6 max-w-xl text-lg leading-8 text-[#7a6a55]">
            Experience premium perfumes crafted with style, depth, and luxury.
            A modern perfume brand with clean elegance and golden highlights.
          </motion.p>

          <motion.div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/products">
              <button className="group inline-flex items-center justify-center gap-3 rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-8 py-4 text-lg font-bold text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.22)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)] hover:shadow-[0_16px_40px_rgba(212,175,55,0.32)] active:scale-95">
                Shop Now
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </button>
            </Link>

            <Link href="/products">
              <button className="rounded-full bg-[#1f1a14] px-8 py-4 text-lg font-bold text-white shadow-[0_12px_28px_rgba(31,26,20,0.18)] transition hover:-translate-y-0.5 hover:bg-[#2a2018]">
                Explore Collection
              </button>
            </Link>
          </motion.div>
        </motion.div>

        <div className="hidden lg:block" aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-b from-transparent to-[#fffaf0]" aria-hidden="true" />
    </section>
  );
}
