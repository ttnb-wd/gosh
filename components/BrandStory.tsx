"use client";

import { motion } from "framer-motion";

export default function BrandStory() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-yellow-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-sm uppercase tracking-[0.35em] text-yellow-600 mb-4">
              Our Story
            </p>
            <h2 className="text-4xl font-black text-black sm:text-5xl mb-6">
              The Art of
              <span className="block text-yellow-600">Perfumery</span>
            </h2>
            <div className="space-y-4 text-lg text-zinc-600 leading-relaxed">
              <p>
                Since 2018, GOSH PERFUME has been crafting exceptional fragrances that capture the essence of luxury and sophistication. Each bottle tells a story, each scent evokes emotion.
              </p>
              <p>
                Our master perfumers blend tradition with innovation, using only the finest ingredients sourced from the world's most prestigious suppliers. Every fragrance is a masterpiece, designed to become your signature.
              </p>
              <p>
                We believe that perfume is more than just a scent—it's an expression of who you are, a memory in the making, and a statement of elegance that lingers long after you've left the room.
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
            <div className="absolute -inset-4 rounded-3xl bg-yellow-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1594735982593-1b0f3e4e5e5e?q=80&w=1200&auto=format&fit=crop"
                alt="Perfume craftsmanship"
                className="h-[500px] w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
