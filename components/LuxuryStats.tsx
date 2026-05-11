"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "120+", label: "Premium Perfumes" },
  { value: "8.5K", label: "Happy Customers" },
  { value: "4.9", label: "Average Rating" },
  { value: "25+", label: "Luxury Brands" }
];

export default function LuxuryStats() {
  return (
    <section role="region" aria-label="Luxury statistics" className="bg-[linear-gradient(135deg,#d4af37_0%,#f7d774_52%,#d4af37_100%)] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="mb-2">
                <span className="text-6xl font-black text-[#1f1a14]">{stat.value}</span>
              </div>
              <p className="text-lg font-semibold text-[#1f1a14]/80">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
