"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export default function BrandStory() {
  const { settings } = useWebsiteSettings();
  const websiteName = settings.website_name || "GOSH PERFUME";

  return (
    <section 
      role="region" 
      aria-label="Brand story" 
      className="bg-[var(--site-bg)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          {/* Label */}
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#b88700] dark:text-[#d4af37] sm:mb-5 sm:text-sm">
            The {websiteName} Experience
          </p>

          {/* Main statement */}
          <h2 className="mb-5 text-[clamp(1.9rem,5.5vw,3rem)] font-black leading-[1.08] tracking-tight text-[#1f1a14] dark:text-[#fff7e6] sm:mb-6 lg:mb-7">
            Curated with Confidence,
            <br />
            <span className="text-[#b88700] dark:text-[#d4af37]">Chosen for You</span>
          </h2>

          {/* Body text */}
          <div className="mx-auto mb-8 max-w-2xl space-y-4 text-[15px] leading-[1.7] text-[#7a6a55] dark:text-[#b8a892] sm:mb-10 sm:text-base lg:mb-12 lg:text-[17px] lg:leading-[1.75]">
            <p>
              {websiteName} is an independent curated perfume shop focused on carefully sourced fragrances, clear product details, and a trustworthy shopping experience.
            </p>
            <p>
              Every perfume is selected with care from trusted suppliers and reviewed before listing. Brand names are shown only to identify products clearly for customers.
            </p>
            <p>
              Find your signature scent with confidence, elegance, and care.
            </p>
          </div>

          {/* Simple CTA link */}
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#b88700] transition hover:gap-3 hover:text-[#8d5f00] dark:text-[#d4af37] dark:hover:text-[#f0c847]"
          >
            Learn More About Us
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
