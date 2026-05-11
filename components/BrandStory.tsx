"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function BrandStory() {
  return (
    <section role="region" aria-label="Brand story" className="bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] pb-8 pt-8 lg:pb-10 lg:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
              Our Story
            </p>
            <h2 className="mb-6 text-4xl font-black text-[#1f1a14] sm:text-5xl">
              The Art of
              <span className="block text-[#b88705]">Perfumery</span>
            </h2>
            <div className="space-y-4 text-lg leading-relaxed text-[#7a6a55]">
              <p>
                Since 2018, GOSH PERFUME has been crafting exceptional fragrances that capture the essence of luxury and sophistication. Each bottle tells a story, each scent evokes emotion.
              </p>
              <p>
                Our master perfumers blend tradition with innovation, using only the finest ingredients sourced from the world&apos;s most prestigious suppliers. Every fragrance is a masterpiece, designed to become your signature.
              </p>
              <p>
                We believe that perfume is more than just a scent—it&apos;s an expression of who you are, a memory in the making, and a statement of elegance that lingers long after you&apos;ve left the room.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-3xl bg-[#f7e7b3]/50 blur-3xl" />
            <div className="relative h-[500px] overflow-hidden rounded-3xl border border-[#d4af37]/25 shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1594735982593-1b0f3e4e5e5e?q=80&w=1200&auto=format&fit=crop"
                alt="Perfume craftsmanship"
                fill
                unoptimized
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
