"use client";

import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import Link from "next/link";

interface PromoSectionProps {
  onCartOpen: () => void;
}

export default function PromoSection({}: PromoSectionProps) {
  return (
    <section className="relative overflow-hidden bg-surface-muted py-10 lg:py-16">
      <div className="absolute inset-0 bg-surface-muted" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-accent-soft px-4 py-2 text-sm text-accent">
            <Gift className="h-4 w-4" />
            Limited Time Offer
          </div>

          <h2 className="text-3xl font-semibold text-ink sm:text-5xl lg:text-6xl">
            Special
            <span className="block text-accent">Promotion</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
            Discover our exclusive offers and limited-time deals on premium luxury perfumes
          </p>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <Link href="/products">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 font-semibold text-on-brand transition hover:bg-brand"
              >
                <Sparkles className="h-5 w-5" />
                Shop Now
              </motion.button>
            </Link>

            <div className="rounded-xl border border-line bg-surface/70 p-6 ">
              <p className="text-2xl font-bold text-accent">30% OFF</p>
              <p className="text-sm text-secondary">On selected items</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
