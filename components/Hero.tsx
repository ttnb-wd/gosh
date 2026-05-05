"use client";

import { motion } from "framer-motion";
import { ArrowRight, Star, ShoppingBag, Users } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section
      role="region"
      aria-label="Hero banner"
      id="home"
      className="relative overflow-hidden bg-white px-4 py-8 sm:px-6 lg:px-8 lg:py-12 dark:bg-zinc-950"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.08),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.08),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.04),transparent_30%)]" />

      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-50 px-4 py-2 text-sm text-yellow-600 dark:border-yellow-500/30 dark:bg-yellow-950/30 dark:text-yellow-400">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            Premium Luxury Perfume
          </div>

          <h1 className="max-w-2xl text-5xl font-black leading-none text-black sm:text-6xl lg:text-7xl dark:text-white">
            Discover the
            <span className="mt-3 block text-yellow-400 dark:text-yellow-400">Scent of</span>
            <span className="mt-3 block text-yellow-400 dark:text-yellow-400">Elegance</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Experience premium perfumes crafted with style, depth, and luxury.
            A modern perfume brand with clean elegance and golden highlights.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/products">
              <button className="group inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-8 py-4 text-lg font-semibold text-black transition hover:scale-105 hover:bg-yellow-300 dark:bg-yellow-500 dark:hover:bg-yellow-400">
                Shop Now
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </button>
            </Link>

            <Link href="/products">
              <button className="rounded-full border border-zinc-200 bg-white px-8 py-4 text-lg font-semibold text-black transition hover:border-yellow-300 hover:bg-yellow-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-yellow-500/50 dark:hover:bg-zinc-700">
                Explore Collection
              </button>
            </Link>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 text-yellow-500 dark:bg-yellow-950/30 dark:text-yellow-400">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-yellow-400">120+</p>
              <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Perfumes</p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 text-yellow-500 dark:bg-yellow-950/30 dark:text-yellow-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-yellow-400">8.5K</p>
              <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Customers</p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 text-yellow-500 dark:bg-yellow-950/30 dark:text-yellow-400">
                <Star className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-yellow-400">4.9</p>
              <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Rating</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-[36px] bg-yellow-100 blur-3xl dark:bg-yellow-950/20" />

          <div className="relative overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-3 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <img
              src="https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?q=80&w=1400&auto=format&fit=crop"
              alt="Luxury Perfume"
              className="h-[520px] w-full rounded-[24px] object-cover"
            />

            <div className="absolute bottom-8 left-8 right-8 rounded-[28px] border border-zinc-200 bg-white/90 p-6 backdrop-blur-xl shadow-lg dark:border-zinc-700 dark:bg-zinc-900/90">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Featured Collection</p>
                  <h3 className="mt-2 text-3xl font-bold text-black dark:text-white">
                    Golden Essence
                  </h3>
                </div>

                <div className="rounded-full bg-yellow-400 px-6 py-3 text-lg font-semibold text-black dark:bg-yellow-500">
                  New
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}