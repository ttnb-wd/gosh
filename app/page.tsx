"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import BrandIntroduction from "@/components/BrandIntroduction";
import FeaturedProducts from "@/components/FeaturedProducts";
import PromotionBanner from "@/components/PromotionBanner";
import CollectionsNavigation from "@/components/CollectionsNavigation";
import BrandStory from "@/components/BrandStory";
import Testimonials from "@/components/Testimonials";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

// Cart item type definition
export interface CartItem {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  image: string;
  qty: number;
  selectedSize?: string;
}

export default function Page() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Calculate cart count from cartItems
  const cartCount = cartItems.reduce((total, item) => total + item.qty, 0);

  const updateCartItemQuantity = (id: string | number, selectedSize: string | undefined, newQuantity: number) => {
    if (newQuantity === 0) {
      // Remove item from cart
      setCartItems(items => items.filter(item => !(item.id === id && item.selectedSize === selectedSize)));
    } else {
      // Update item quantity
      setCartItems(items => 
        items.map(item => 
          (item.id === id && item.selectedSize === selectedSize) ? { ...item, qty: newQuantity } : item
        )
      );
    }
  };

  return (
    <main role="main" className="min-h-screen bg-[var(--site-bg)] text-[#1f1a14]">
      <Navbar 
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
      />
      {/* HERO - LOCKED, DO NOT MODIFY */}
      <Hero />
      
      {/* NEW HOMEPAGE STRUCTURE - VISUAL RHYTHM REDESIGN */}
      <BrandIntroduction />
      <FeaturedProducts />
      <PromotionBanner />
      <CollectionsNavigation />
      <BrandStory />
      <Testimonials />
      <FinalCTA />
      <Footer />
      
      {/* Cart Drawer - Rendered once at page level */}
      <CartDrawer 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
      />
    </main>
  );
}
