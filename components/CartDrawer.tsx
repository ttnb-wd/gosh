"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CartItem {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  qty: number;
  image: string;
  selectedSize?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems?: CartItem[];
  onUpdateQuantity?: (id: string | number, selectedSize: string | undefined, newQuantity: number) => void;
}

export default function CartDrawer({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onUpdateQuantity = () => {} 
}: CartDrawerProps) {
  const router = useRouter();
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const isEmpty = cartItems.length === 0;

  const handleContinueShopping = () => {
    onClose();
    router.push('/products');
  };

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  const handleRemoveAll = () => {
    cartItems.forEach(item => {
      onUpdateQuantity(item.id, item.selectedSize, 0);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Cart Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed right-0 top-0 z-[60] h-full w-full bg-white shadow-2xl sm:max-w-[92vw] sm:rounded-l-3xl md:max-w-md"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 p-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-black">Your Bag</h2>
                  {!isEmpty && (
                    <button
                      type="button"
                      onClick={handleRemoveAll}
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-4 py-2 text-sm font-semibold text-neutral-800 shadow-[0_8px_24px_rgba(234,179,8,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 hover:shadow-[0_12px_30px_rgba(234,179,8,0.24)]"
                    >
                      <Trash2 className="h-4 w-4 text-yellow-600 transition-transform duration-300 group-hover:scale-110" />
                      <span>Remove All</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
                  aria-label="Close bag"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="scrollbar-auto-hide flex-1 overflow-y-auto">
                {isEmpty ? (
                  /* Empty State */
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-yellow-400/30 bg-yellow-50 text-yellow-600">
                      <ShoppingBag className="h-10 w-10" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-black">Your bag is empty</h3>
                    <p className="mb-6 text-zinc-600">
                      Discover our luxury fragrances and add them to your bag.
                    </p>
                    <button
                      onClick={handleContinueShopping}
                      className="rounded-2xl bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  /* Cart Items */
                  <div className="p-6">
                    <div className="space-y-4">
                      {cartItems.map((item, index) => (
                        <motion.div
                          key={`${item.id}-${item.selectedSize || 'default'}-${index}`}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-20 w-20 rounded-xl object-cover"
                          />
                          <div className="flex-1">
                            <div className="mb-2">
                              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                                {item.brand}
                              </p>
                              <h4 className="font-semibold text-black">{item.name}</h4>
                              {item.selectedSize && (
                                <p className="text-xs text-neutral-500 mt-0.5">Size: {item.selectedSize}</p>
                              )}
                              <p className="text-sm font-bold text-yellow-600">${item.price}</p>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.qty - 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-black">
                                  {item.qty}
                                </span>
                                <button
                                  onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.qty + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              
                              <p className="text-sm font-bold text-black">
                                ${(item.price * item.qty).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Only show if not empty */}
              {!isEmpty && (
                <div className="border-t border-zinc-200 p-6">
                  {/* Subtotal */}
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-sm text-zinc-600">
                      <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.qty, 0)} items)</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-black">
                      <span>Total</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button 
                      onClick={handleCheckout}
                      className="w-full rounded-2xl bg-yellow-400 py-4 font-semibold text-black transition hover:bg-yellow-300"
                    >
                      Checkout
                    </button>
                    <button
                      onClick={handleContinueShopping}
                      className="w-full rounded-2xl border border-zinc-200 bg-white py-4 font-semibold text-black transition hover:bg-zinc-50"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
