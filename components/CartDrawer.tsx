"use client";
import StudioModal from "@/components/ui/StudioModal";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ComponentErrorBoundary } from "./ErrorBoundaries";

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

function CartDrawerContent({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onUpdateQuantity = () => {} 
}: CartDrawerProps) {
  const router = useRouter();
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const isEmpty = cartItems.length === 0;
  const formatMmk = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;

  // Lock body scroll when cart drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

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
            className="fixed inset-0 z-50 bg-overlay "
            onClick={onClose}
          />

          {/* Cart Drawer */}
          <StudioModal label="Your shopping bag" onDismiss={onClose} lockScroll={false}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="studio-cart fixed right-0 top-0 z-[60] h-full w-full bg-surface shadow-soft sm:max-w-[92vw] sm:rounded-l-3xl md:max-w-md"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line p-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-ink">Your Bag</h2>
                  {!isEmpty && (
                    <button
                      type="button"
                      onClick={handleRemoveAll}
                      aria-label="Remove all items from bag"
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface/90 px-4 py-2 text-sm font-semibold text-ink shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:border-line hover:bg-accent-soft hover:text-accent hover:shadow-panel"
                    >
                      <Trash2 className="h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                      <span>Remove All</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-all duration-200 hover:border-line hover:bg-surface-muted hover:text-secondary"
                  aria-label="Close shopping bag"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Content */}
              <div className="scrollbar-auto-hide flex-1 overflow-y-auto">
                {isEmpty ? (
                  /* Empty State */
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
                      <ShoppingBag className="h-10 w-10" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-ink">Your bag is empty</h3>
                    <p className="mb-6 text-secondary">
                      Discover our luxury fragrances and add them to your bag.
                    </p>
                    <button
                      onClick={handleContinueShopping}
                      type="button"
                      aria-label="Continue shopping"
                      className="studio-button studio-button--primary rounded-xl bg-brand px-6 py-3 font-semibold text-on-brand transition hover:bg-brand"
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
                          className="flex gap-4 rounded-xl border border-line bg-surface p-4 shadow-soft"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-20 w-20 rounded-xl object-cover"
                          />
                          <div className="flex-1">
                            <div className="mb-2">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                                {item.brand}
                              </p>
                              <h4 className="font-semibold text-ink">{item.name}</h4>
                              {item.selectedSize && (
                                <p className="text-xs text-muted mt-0.5">Size: {item.selectedSize}</p>
                              )}
                              <p className="text-sm font-bold text-accent">{formatMmk(item.price)}</p>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2" role="group" aria-label={`Quantity controls for ${item.name}`}>
                                <button
                                  onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.qty - 1)}
                                  type="button"
                                  aria-label={`Decrease quantity of ${item.name}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-line hover:text-secondary"
                                >
                                  <Minus className="h-3 w-3" aria-hidden="true" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-ink" aria-label={`Quantity: ${item.qty}`}>
                                  {item.qty}
                                </span>
                                <button
                                  onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.qty + 1)}
                                  type="button"
                                  aria-label={`Increase quantity of ${item.name}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-line hover:text-secondary"
                                >
                                  <Plus className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </div>
                              
                              <p className="text-sm font-bold text-ink">
                                {formatMmk(item.price * item.qty)}
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
                <div className="border-t border-line p-6">
                  {/* Subtotal */}
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-sm text-secondary">
                      <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.qty, 0)} items)</span>
                      <span>{formatMmk(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-ink">
                      <span>Total</span>
                      <span>{formatMmk(subtotal)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button 
                      onClick={handleCheckout}
                      type="button"
                      aria-label="Proceed to checkout"
                      className="studio-button studio-button--primary w-full rounded-xl bg-brand py-4 font-semibold text-on-brand transition hover:bg-brand"
                    >
                      Checkout
                    </button>
                    <button
                      onClick={handleContinueShopping}
                      type="button"
                      aria-label="Continue shopping for more products"
                      className="w-full rounded-xl border border-line bg-surface py-4 font-semibold text-ink transition hover:bg-surface-muted"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              )}
            </div>
          </StudioModal>
        </>
      )}
    </AnimatePresence>
  );
}

export default function CartDrawer(props: CartDrawerProps) {
  return (
    <ComponentErrorBoundary context="cart-drawer">
      <CartDrawerContent {...props} />
    </ComponentErrorBoundary>
  );
}
