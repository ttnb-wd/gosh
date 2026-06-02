"use client";

import { motion } from "framer-motion";
import { Award, Shield, Truck, Heart } from "lucide-react";

const features = [
  {
    icon: <Award className="h-8 w-8" />,
    title: "Premium Quality",
    description: "Handcrafted with the finest ingredients from around the world"
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Authenticity Guaranteed",
    description: "100% genuine luxury fragrances with certificate of authenticity"
  },
  {
    icon: <Truck className="h-8 w-8" />,
    title: "Free Shipping",
    description: "Complimentary express delivery on orders over $100"
  },
  {
    icon: <Heart className="h-8 w-8" />,
    title: "Customer Care",
    description: "Dedicated support team ready to help you find your perfect scent"
  }
];

export default function WhyChooseUs() {
  return (
    <section role="region" aria-label="Why choose us" className="bg-[var(--site-bg)] pb-16 pt-8 lg:pb-24 lg:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
            Why Choose GOSH
          </p>
          <h2 className="text-4xl font-black text-[#1f1a14] sm:text-5xl">
            The GOSH Difference
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#7a6a55]">
            Experience luxury perfume shopping like never before
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-[#fbf6ed] p-8 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:border-[#6f1d1b]/25 hover:shadow-[0_18px_45px_rgba(212,175,55,0.14),0_6px_18px_rgba(111,29,27,0.08)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/0 to-[#f7e7b3]/35 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                <div className="relative">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff7e6] text-[#d4af37] transition-all duration-500 group-hover:scale-110 group-hover:bg-[#d4af37] group-hover:text-[#1f1a14]">
                    {feature.icon}
                  </div>
                  
                  <h3 className="mb-3 text-xl font-bold text-[#1f1a14]">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-[#7a6a55]">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
