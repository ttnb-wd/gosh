"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section 
      role="region" 
      aria-label="Shop now call to action" 
      className="bg-[var(--site-bg)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          {/* Main heading */}
          <h2 className="mb-5 text-[clamp(2rem,5.5vw,3.2rem)] font-black leading-[1.08] tracking-tight text-[#1f1a14] dark:text-[#fff7e6] sm:mb-6 lg:mb-7">
            Find Your Perfect Scent
          </h2>

          {/* Supporting text */}
          <p className="mx-auto mb-8 max-w-xl text-[15px] leading-relaxed text-[#7a6a55] dark:text-[#b8a892] sm:mb-10 sm:text-base lg:mb-12 lg:text-[17px]">
            Browse our curated collection of authentic fragrances. Every perfume is carefully sourced and quality checked.
          </p>

          {/* CTA Button */}
          <Link
            href="/products"
            className="group inline-flex items-center gap-3 rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-8 py-4 text-base font-bold uppercase tracking-wide text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)] hover:shadow-[0_16px_40px_rgba(212,175,55,0.32)] active:scale-95 sm:px-10 sm:py-5 sm:text-lg"
          >
            Explore All Fragrances
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
