"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import ProductSection from "@/components/ProductSection";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

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

// Product type (from ProductSection)
interface Product {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  selectedSize?: string;
  sizes?: { label: string; price: number }[];
  decants?: { label: string; price: number }[];
}

export default function ProductsPage() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("All");
  const lastAddedRef = useRef<{ id: string | number; timestamp: number } | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem("gosh_cart");
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          setCartItems(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error("Failed to load cart:", error);
      }
    };
    loadCart();
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("gosh_cart", JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  }, [cartItems]);

  // Calculate cart count from cartItems
  const cartCount = cartItems.reduce((total, item) => total + item.qty, 0);

  const handleAddToBag = (product: Product) => {
    // Prevent duplicate adds within 300ms
    const now = Date.now();
    if (lastAddedRef.current?.id === product.id && now - lastAddedRef.current.timestamp < 300) {
      return;
    }
    lastAddedRef.current = { id: product.id, timestamp: now };

    // Use the price from the product (already set to selected size price)
    const priceNumber = product.price;
    
    // Use direct state update to avoid StrictMode double-invocation issues
    const currentItems = [...cartItems];
    
    // Find existing item with same product ID and same size
    const existingItemIndex = currentItems.findIndex(
      item => item.id === product.id && item.selectedSize === product.selectedSize
    );
    
    if (existingItemIndex >= 0) {
      // Same product + same size: increase quantity by 1
      currentItems[existingItemIndex] = {
        ...currentItems[existingItemIndex],
        qty: currentItems[existingItemIndex].qty + 1
      };
      setCartItems(currentItems);
    } else {
      // New item or different size: add as new cart line
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: priceNumber,
        image: product.image,
        qty: 1,
        selectedSize: product.selectedSize
      };
      setCartItems([...currentItems, newItem]);
    }
    
    // Do NOT open cart drawer - just add to cart silently
  };

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
    <motion.main 
      role="main"
      className="min-h-screen bg-white text-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Navbar 
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)} 
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        <ProductSection 
          selectedBrand={selectedBrand}
          onBrandSelect={setSelectedBrand}
          onAddToBag={handleAddToBag} 
        />
      </motion.div>
      
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
