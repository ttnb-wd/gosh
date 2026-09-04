"use client";

import { motion } from "framer-motion";

export default function BrandIntroduction() {
  return (
    <section 
      role="region" 
      aria-label="Brand introduction" 
      className="bg-[var(--site-bg)] px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          {/* Main statement */}
          <h2 className="mb-4 text-[clamp(1.75rem,5vw,2.75rem)] font-black leading-[1.12] tracking-tight text-[#1f1a14] dark:text-[#fff7e6] sm:mb-5 lg:mb-6">
            Fragrance, Curated for
            <br />
            Every Moment
          </h2>

          {/* Supporting text */}
          <p className="mx-auto mb-8 max-w-2xl text-[15px] leading-relaxed text-[#7a6a55] dark:text-[#b8a892] sm:mb-10 sm:text-base lg:mb-12 lg:text-[17px] lg:leading-[1.7]">
            Discover carefully sourced perfumes selected for elegance, quality, and authenticity. Every fragrance is reviewed before listing, so you can shop with confidence.
          </p>

          {/* Trust points - horizontal layout */}
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:gap-x-10 sm:gap-y-4 sm:text-base">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" aria-hidden="true" />
              <span className="font-semibold text-[#4f4234] dark:text-[#c9b8a0]">
                Authentic products
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" aria-hidden="true" />
              <span className="font-semibold text-[#4f4234] dark:text-[#c9b8a0]">
                Trusted sources
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" aria-hidden="true" />
              <span className="font-semibold text-[#4f4234] dark:text-[#c9b8a0]">
                Quality checked
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
