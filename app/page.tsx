"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CollectionPreview from "@/components/CollectionPreview";
import ScentQuiz from "@/components/ScentQuiz";
import IngredientShowcase from "@/components/IngredientShowcase";
import BrandStory from "@/components/BrandStory";
import WhyChooseUs from "@/components/WhyChooseUs";
import LuxuryStats from "@/components/LuxuryStats";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
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
    <main className="min-h-screen bg-white text-black">
      <Navbar 
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
      />
      <Hero />
      <CollectionPreview />
      <ScentQuiz />
      <IngredientShowcase />
      <BrandStory />
      <WhyChooseUs />
      <LuxuryStats />
      <Testimonials />
      <Newsletter />
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
