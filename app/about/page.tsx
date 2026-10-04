"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Heart, Award, Leaf, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
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
      className="studio-page studio-about min-h-screen bg-[var(--site-bg)] text-ink"
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
            <p className="mb-4 text-xs uppercase tracking-[0.24em] text-brand sm:text-sm sm:tracking-[0.35em]">
              Our Story
            </p>
            <h1 className="studio-gradient mb-6 text-4xl font-semibold leading-tight text-ink sm:text-6xl lg:text-7xl">
              About
              <span className="block text-accent">GOSH PERFUME STUDIO</span>
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted sm:text-xl">
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
              <h2 className="mb-6 text-3xl font-semibold text-ink sm:text-4xl">
                Our Promise
                <span className="block text-accent">Authentic Fragrances</span>
              </h2>
              <div className="space-y-4 leading-relaxed text-muted">
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
              <div className="absolute -inset-4 rounded-xl bg-accent-soft/45 hidden" />
              <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-panel sm:p-8">
                <img
                  src="https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=1400&auto=format&fit=crop"
                  alt="Luxury perfume craftsmanship"
                  className="h-64 w-full rounded-2xl object-cover sm:h-80"
                />
                <div className="mt-6 text-center">
                  <p className="text-sm font-medium text-brand">Carefully Sourced</p>
                  <p className="mt-2 text-muted">Quality checked before every product is listed</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

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
            <h2 className="mb-6 text-3xl font-semibold text-ink sm:text-4xl">
              Why Choose
              <span className="block text-accent">{websiteName}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted">
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
                className="rounded-xl border border-line bg-surface p-5 text-center shadow-panel sm:p-6"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-surface text-accent">
                  {value.icon}
                </div>
                <h3 className="mb-3 text-lg font-bold text-ink">{value.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{value.description}</p>
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
            <h2 className="mb-6 text-3xl font-semibold text-ink sm:text-4xl">
              Ready to Discover
              <span className="block text-accent">Your Signature Scent?</span>
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted">
              Explore our carefully sourced fragrance collection and choose the scent that suits
              your style, mood, and daily life.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex items-center gap-2 rounded-full border border-line bg-brand px-8 py-4 font-semibold text-on-brand shadow-panel transition hover:bg-brand"
                >
                  Explore Collection
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </motion.button>
              </Link>
              
              <Link href="/contact">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-8 py-4 font-semibold text-ink transition hover:border-brand/25 hover:bg-surface"
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
