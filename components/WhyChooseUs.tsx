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
    <section role="region" aria-label="Why choose us" className="py-16 lg:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-600 mb-4">
            Why Choose GOSH
          </p>
          <h2 className="text-4xl font-black text-black sm:text-5xl">
            The GOSH Difference
          </h2>
          <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
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
              <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-yellow-400/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                <div className="relative">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 transition-all duration-500 group-hover:bg-yellow-400 group-hover:text-black group-hover:scale-110">
                    {feature.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold text-black mb-3">{feature.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
