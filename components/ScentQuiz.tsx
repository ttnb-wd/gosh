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

const cardEntry = [
  { x: -80, y: -80 },
  { x: 80, y: -80 },
  { x: -80, y: 80 },
  { x: 80, y: 80 },
];

export default function ScentQuiz() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section role="region" aria-label="Product catalog" className="bg-[var(--site-bg)] pb-8 pt-8 lg:pb-10 lg:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center"
        >
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
            Personalized Experience
          </p>
          <h2 className="text-4xl font-black text-[#1f1a14] sm:text-5xl">
            Find Your Signature Scent
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#7a6a55]">
            Tell us your preference and we&apos;ll recommend the perfect fragrance
          </p>
        </motion.div>

        <div className="mx-auto mb-8 grid max-w-5xl gap-6 md:grid-cols-2">
          {preferences.map((pref, index) => (
            <motion.button
              key={pref.value}
              initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)", ...cardEntry[index] }}
              whileInView={{ opacity: 1, scale: 1, x: 0, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{
                duration: 0.34,
                ease: [0.22, 1, 0.36, 1],
              }}
              onClick={() => setSelected(pref.value)}
              className={`group relative overflow-hidden rounded-3xl border-2 p-8 text-center transition-all duration-300 ${
                selected === pref.value
                  ? "border-[#d4af37] bg-[#fff7e6] shadow-[0_18px_45px_rgba(212,175,55,0.16)]"
                  : "border-[#d4af37]/20 bg-white hover:border-[#6f1d1b]/30 hover:shadow-[0_14px_34px_rgba(212,175,55,0.12)]"
              }`}
            >
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                selected === pref.value
                  ? "bg-[#d4af37] text-[#1f1a14]"
                  : "bg-[#fff7e6] text-[#d4af37] group-hover:bg-[#f7e7b3]"
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
              <button className="rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-8 py-4 font-semibold text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.22)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)] hover:shadow-[0_16px_40px_rgba(212,175,55,0.32)]">
                View Recommended Perfumes
              </button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
