"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const collections = [
  {
    title: "Floral Collection",
    description: "Delicate blooms and fresh petals",
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=800&auto=format&fit=crop",
    count: "24 Perfumes"
  },
  {
    title: "Woody Collection",
    description: "Rich amber and deep wood notes",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop",
    count: "18 Perfumes"
  },
  {
    title: "Oriental Collection",
    description: "Exotic spices and warm vanilla",
    image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=800&auto=format&fit=crop",
    count: "32 Perfumes"
  }
];

const cardStartOffset = [260, 0, -260];

export default function CollectionPreview() {
  return (
    <section role="region" aria-label="Collection preview" className="bg-white pb-8 pt-8 lg:pb-10 lg:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="mb-9 text-center"
        >
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
            Explore Collections
          </p>
          <h2 className="text-4xl font-black text-[#1f1a14] sm:text-5xl">
            Luxury Collections
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#7a6a55]">
            Discover our curated collections of premium fragrances
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.title}
              initial={{
                opacity: 0,
                y: -120,
                x: cardStartOffset[index],
                scale: 0.92,
              }}
              whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                type: "spring",
                stiffness: 92,
                damping: 18,
                mass: 0.9,
                delay: 0.14 + index * 0.12,
              }}
            >
              <Link href="/products">
                <div className="group relative overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:border-[#6f1d1b]/25 hover:shadow-[0_18px_45px_rgba(212,175,55,0.14),0_6px_18px_rgba(111,29,27,0.08)]">
                  <div className="relative h-80 overflow-hidden">
                    <img
                      src={collection.image}
                      alt={collection.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <p className="text-sm font-medium text-yellow-400 mb-2">{collection.count}</p>
                    <h3 className="text-2xl font-bold mb-2">{collection.title}</h3>
                    <p className="text-sm text-white/90 mb-4">{collection.description}</p>
                    
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 transition group-hover:gap-3">
                      Explore Collection
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
