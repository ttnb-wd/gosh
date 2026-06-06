"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Heart, Award, Leaf, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import AdsBanner from "@/components/AdsBanner";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

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
  const { settings } = useWebsiteSettings();
  const websiteName = settings.website_name || "GOSH PERFUME";
  const aboutText =
    settings.about_text ||
    "Authentic fragrances, carefully sourced for your confidence. GOSH PERFUME STUDIO is a curated perfume store created for customers who want to discover premium scents with peace of mind.";

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
      title: "Authenticity First",
      description: "We carefully source authentic perfumes from trusted suppliers and reliable fragrance sources."
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Carefully Sourced",
      description: "Each collection is selected with care to make premium fragrances more accessible to our customers."
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Quality Checked",
      description: "We review product condition, packaging, stock information, scent profile, and details before listing."
    },
    {
      icon: <Leaf className="h-6 w-6" />,
      title: "Customer-First Service",
      description: "Clear product information, secure ordering, payment verification, and customer care help you shop with confidence."
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
              <span className="block text-[#b88705]">GOSH PERFUME STUDIO</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-[#7a6a55]">
              {aboutText}
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
                Our Promise
                <span className="block text-[#b88705]">Authentic Fragrances</span>
              </h2>
              <div className="space-y-4 leading-relaxed text-[#7a6a55]">
                <p>
                  GOSH PERFUME STUDIO is an independent perfume reseller and curated fragrance
                  shop. We carefully source and resell perfumes from trusted suppliers, selected
                  collections, and reliable fragrance sources to make luxury scents more accessible.
                </p>
                <p>
                  Every product we offer is checked with care before being listed. We focus on
                  authentic perfumes, clean presentation, proper product details, and a trustworthy
                  shopping experience so customers can buy fragrances with less confusion and
                  greater confidence.
                </p>
                <p>
                  We are not the official owner or manufacturer of the international perfume brands
                  shown in our store. Brand names are used only to identify products clearly for
                  customers, and our goal is always to provide honest information and reliable service.
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
                  <p className="text-sm font-medium text-[#6f1d1b]">Carefully Sourced</p>
                  <p className="mt-2 text-[#7a6a55]">Quality checked before every product is listed</p>
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
              <span className="block text-[#b88705]">{websiteName}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#7a6a55]">
              We aim to make premium perfume shopping clear, trustworthy, and enjoyable for every customer.
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
              Explore our carefully sourced fragrance collection and choose the scent that suits
              your style, mood, and daily life.
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
