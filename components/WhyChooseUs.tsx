"use client";

import { motion } from "framer-motion";
import { Award, Shield, Truck, Heart } from "lucide-react";

const features = [
  {
    icon: <Award className="h-8 w-8" />,
    title: "Carefully Sourced",
    description: "Selected from trusted fragrance suppliers."
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Quality Checked",
    description: "Products are reviewed before listing."
  },
  {
    icon: <Truck className="h-8 w-8" />,
    title: "Authentic Focus",
    description: "Honest details for confident shopping."
  },
  {
    icon: <Heart className="h-8 w-8" />,
    title: "Secure Shopping",
    description: "Simple ordering and customer support."
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
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-brand">
            Trusted Shopping Experience
          </p>
          <h2 className="whitespace-nowrap text-2xl font-semibold text-ink sm:text-4xl lg:text-5xl">
            Shop with Confidence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            We focus on carefully sourced perfumes, clear product details, and a smooth shopping experience.
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
              <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-8 shadow-soft transition-all duration-500 hover:-translate-y-2 hover:border-brand/25 hover:shadow-panel    ">
                <div className="absolute inset-0 bg-gradient-to-br from-brand/0 to-accent-soft/35 opacity-0 transition-opacity duration-500 group-hover:opacity-100 " />
                
                <div className="relative">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-surface text-accent transition-all duration-500 group-hover:scale-110 group-hover:bg-brand group-hover:text-on-brand   ">
                    {feature.icon}
                  </div>
                  
                  <h3 className="mb-3 text-xl font-bold text-ink">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
