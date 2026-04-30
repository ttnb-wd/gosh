"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, Heart, Leaf, Sun } from "lucide-react";

const preferences = [
  { icon: <Sparkles className="h-6 w-6" />, label: "Fresh & Clean", value: "fresh" },
  { icon: <Heart className="h-6 w-6" />, label: "Romantic & Floral", value: "floral" },
  { icon: <Leaf className="h-6 w-6" />, label: "Woody & Earthy", value: "woody" },
  { icon: <Sun className="h-6 w-6" />, label: "Warm & Spicy", value: "spicy" }
];

export default function ScentQuiz() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-yellow-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-600 mb-4">
            Personalized Experience
          </p>
          <h2 className="text-4xl font-black text-black sm:text-5xl">
            Find Your Signature Scent
          </h2>
          <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
            Tell us your preference and we&apos;ll recommend the perfect fragrance
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {preferences.map((pref, index) => (
            <motion.button
              key={pref.value}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => setSelected(pref.value)}
              className={`group relative overflow-hidden rounded-3xl border-2 p-8 text-center transition-all duration-300 ${
                selected === pref.value
                  ? "border-yellow-400 bg-yellow-50 shadow-lg"
                  : "border-zinc-200 bg-white hover:border-yellow-300 hover:shadow-md"
              }`}
            >
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                selected === pref.value
                  ? "bg-yellow-400 text-black"
                  : "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100"
              }`}>
                {pref.icon}
              </div>
              <h3 className="text-lg font-bold text-black">{pref.label}</h3>
            </motion.button>
          ))}
        </div>

        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Link href="/products">
              <button className="rounded-full bg-yellow-400 px-8 py-4 font-semibold text-black transition hover:bg-yellow-300 hover:scale-105">
                View Recommended Perfumes
              </button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
