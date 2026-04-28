"use client";

import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import Link from "next/link";

interface PromoSectionProps {
  onCartOpen: () => void;
}

export default function PromoSection({ onCartOpen }: PromoSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 py-10 lg:py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.15),transparent_50%)]" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-200 px-4 py-2 text-sm text-yellow-800">
            <Gift className="h-4 w-4" />
            Limited Time Offer
          </div>

          <h2 className="text-3xl font-black text-black sm:text-5xl lg:text-6xl">
            Special
            <span className="block text-yellow-600">Promotion</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
            Discover our exclusive offers and limited-time deals on premium luxury perfumes
          </p>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <Link href="/products">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group inline-flex items-center gap-2 rounded-full bg-yellow-400 px-8 py-4 font-semibold text-black transition hover:bg-yellow-300"
              >
                <Sparkles className="h-5 w-5" />
                Shop Now
              </motion.button>
            </Link>

            <div className="rounded-2xl border border-yellow-400/30 bg-white/70 p-6 backdrop-blur-sm">
              <p className="text-2xl font-bold text-yellow-600">30% OFF</p>
              <p className="text-sm text-zinc-600">On selected items</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}