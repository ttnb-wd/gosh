"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { HomepageHero, HomepageIntroduction, HomepageScentStory, HomepageFinale, HomepageAtmosphere } from "@/components/homepage/HomepageVisuals";
import "./homepage.css";
import PromotionBanner from "@/components/PromotionBanner";
import CollectionsNavigation from "@/components/CollectionsNavigation";
import BrandStory from "@/components/BrandStory";
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
    <main role="main" className="studio-page homepage-luxury min-h-screen bg-[var(--site-bg)] text-ink">
      <HomepageAtmosphere />
      <Navbar 
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
      />
      {/* Original animated fragrance composition */}
      <HomepageHero />
      
      <HomepageIntroduction />
      <HomepageScentStory />
      <PromotionBanner />
      <CollectionsNavigation />
      <BrandStory />
      <Testimonials />
      <HomepageFinale />
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
