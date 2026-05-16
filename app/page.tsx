"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import BrandMarqueeSlider from "@/components/BrandMarqueeSlider";
import CollectionPreview from "@/components/CollectionPreview";
import FragranceCreationSection from "@/components/FragranceCreationSection";
import ScentQuiz from "@/components/ScentQuiz";
import IngredientShowcase from "@/components/IngredientShowcase";
import BrandStory from "@/components/BrandStory";
import WhyChooseUs from "@/components/WhyChooseUs";
import LuxuryStats from "@/components/LuxuryStats";
import Testimonials from "@/components/Testimonials";
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

// Temporarily hidden. Set to true when we want to show this section again.
const SHOW_SIGNATURE_SCENT_SECTION = false;
// Temporarily hidden. Set to true when we want to show this section again.
const SHOW_BRAND_GALLERY_SECTION = false;

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
      <Hero />
      <CollectionPreview />
      <FragranceCreationSection />
      {SHOW_BRAND_GALLERY_SECTION && (
        <section
          role="region"
          aria-label="Brand gallery"
          className="bg-[var(--site-bg)] pb-3 pt-5"
        >
          <div>
            <BrandMarqueeSlider />
          </div>
        </section>
      )}
      {SHOW_SIGNATURE_SCENT_SECTION && <ScentQuiz />}
      <IngredientShowcase />
      <BrandStory />
      <WhyChooseUs />
      <LuxuryStats />
      <Testimonials />
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
