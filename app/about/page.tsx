"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Heart, Award, Leaf, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import AdsBanner from "@/components/AdsBanner";

// Cart item type definition
interface CartItem {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  image: string;
  qty: number;
  selectedSize?: string;
}

export default function AboutPage() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const updateCartItemQuantity = (id: string | number, selectedSize: string | undefined, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems(items => items.filter(item => !(item.id === id && item.selectedSize === selectedSize)));
    } else {
      setCartItems(items => 
        items.map(item => 
          (item.id === id && item.selectedSize === selectedSize) ? { ...item, qty: newQuantity } : item
        )
      );
    }
  };
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const values = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Premium Quality",
      description: "Every fragrance is crafted with the finest ingredients sourced from around the world, ensuring unparalleled quality and longevity."
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Passionate Craftsmanship",
      description: "Our master perfumers pour their heart and soul into each creation, blending art with science to create unforgettable scents."
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Award-Winning Excellence",
      description: "Recognized globally for our innovative fragrances and commitment to excellence in luxury perfume creation."
    },
    {
      icon: <Leaf className="h-6 w-6" />,
      title: "Sustainable Luxury",
      description: "We believe in responsible luxury, using ethically sourced ingredients and sustainable practices in our production."
    }
  ];

  return (
    <motion.main 
      role="main"
      className="min-h-screen bg-[var(--site-bg)] text-[#1f1a14]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Navbar cartCount={0} onCartOpen={() => setCartOpen(true)} />
      
      {/* Hero Section */}
      <section role="region" aria-label="About us hero" className="relative overflow-hidden bg-[var(--site-bg)] py-8 lg:py-12">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
              Our Story
            </p>
            <h1 className="mb-6 text-4xl font-black text-[#1f1a14] sm:text-6xl lg:text-7xl">
              About
              <span className="block text-[#b88705]">GOSH PERFUME</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-[#7a6a55]">
              Where luxury meets artistry. We create exceptional fragrances that tell stories, 
              evoke emotions, and define moments. Each bottle represents our commitment to 
              excellence and our passion for the art of perfumery.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="-mt-px bg-[var(--site-bg)] py-10 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.8 }}
            >
              <h2 className="mb-6 text-3xl font-black text-[#1f1a14] sm:text-4xl">
                Our Journey
                <span className="block text-[#b88705]">Since 2018</span>
              </h2>
              <div className="space-y-4 leading-relaxed text-[#7a6a55]">
                <p>
                  Founded in the heart of Beverly Hills, GOSH PERFUME began as a dream to create
                  fragrances that transcend the ordinary. Our founder, inspired by travels across
                  the world&apos;s most exotic locations, sought to capture the essence of luxury in
                  every bottle.
                </p>
                <p>
                  What started as a small boutique has grown into a globally recognized luxury
                  brand, yet we&apos;ve never lost sight of our core values: quality, craftsmanship,
                  and the belief that the right fragrance can transform not just how you smell,
                  but how you feel.
                </p>
                <p>
                  Today, we continue to push the boundaries of perfumery, creating scents that 
                  are both timeless and contemporary, classic yet innovative.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-3xl bg-[#f7e7b3]/45 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-white p-8 shadow-[0_20px_80px_rgba(31,26,20,0.08)]">
                <img
                  src="https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=1400&auto=format&fit=crop"
                  alt="Luxury perfume craftsmanship"
                  className="h-80 w-full rounded-2xl object-cover"
                />
                <div className="mt-6 text-center">
                  <p className="text-sm font-medium text-[#6f1d1b]">Handcrafted Excellence</p>
                  <p className="mt-2 text-[#7a6a55]">Every fragrance tells a unique story</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <AdsBanner />

      {/* Why Choose Us Section */}
      <section className="-mt-px bg-[var(--site-bg)] py-10 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="text-center mb-10"
          >
            <h2 className="mb-6 text-3xl font-black text-[#1f1a14] sm:text-4xl">
              Why Choose
              <span className="block text-[#b88705]">GOSH PERFUME</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#7a6a55]">
              We don&apos;t just create perfumes; we craft experiences that become part of your identity.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ duration: 0.6 }}
                className="rounded-3xl border border-[#d4af37]/25 bg-white p-6 text-center shadow-[0_18px_45px_rgba(212,175,55,0.12),0_6px_18px_rgba(111,29,27,0.06)]"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-[#fff7e6] text-[#d4af37]">
                  {value.icon}
                </div>
                <h3 className="mb-3 text-lg font-bold text-[#1f1a14]">{value.title}</h3>
                <p className="text-sm leading-relaxed text-[#7a6a55]">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative -mt-px overflow-hidden bg-[var(--site-bg)] py-10 lg:py-16">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="mb-6 text-3xl font-black text-[#1f1a14] sm:text-4xl">
              Ready to Discover
              <span className="block text-[#b88705]">Your Signature Scent?</span>
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-[#7a6a55]">
              Explore our exclusive collection of luxury fragrances or visit our boutique 
              for a personalized fragrance consultation.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group inline-flex items-center gap-2 rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-8 py-4 font-semibold text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.22)] transition hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)]"
                >
                  Explore Collection
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </motion.button>
              </Link>
              
              <Link href="/contact">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-white px-8 py-4 font-semibold text-[#1f1a14] transition hover:border-[#6f1d1b]/25 hover:bg-[#fff7e6]"
                >
                  Book Consultation
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      <Footer />
      
      {/* Cart Drawer - Rendered once at page level */}
      <CartDrawer 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
      />
    </motion.main>
  );
}
