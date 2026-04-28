"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Package, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  payment_method: string;
  payment_status: string;
  status: string;
  total: number;
  created_at: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  // Load cart from localStorage
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem("gosh_cart");
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error("Failed to load cart:", error);
      }
    };

    loadCart();
    window.addEventListener("storage", loadCart);
    window.addEventListener("cart-updated", loadCart);

    return () => {
      window.removeEventListener("storage", loadCart);
      window.removeEventListener("cart-updated", loadCart);
    };
  }, []);

  const cartCount = cartItems.reduce((total, item) => total + item.qty, 0);

  // Check authentication and load orders
  useEffect(() => {
    const checkAuthAndLoadOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login?redirect=/orders");
        return;
      }

      setUser(user);

      // Load orders for this user
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load orders:", error);
      } else {
        setOrders(ordersData || []);
      }

      setLoading(false);
    };

    checkAuthAndLoadOrders();
  }, [router, supabase]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "confirmed":
        return <Package className="h-5 w-5 text-blue-600" />;
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-purple-600" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "processing":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const refreshOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load orders:", error);
    } else {
      setOrders(ordersData || []);
    }
    setLoading(false);
  };

  const updateCartItemQuantity = (id: number, selectedSize: string | undefined, newQuantity: number) => {
    if (newQuantity === 0) {
      const updatedItems = cartItems.filter(item => !(item.id === id && item.selectedSize === selectedSize));
      setCartItems(updatedItems);
      localStorage.setItem("gosh_cart", JSON.stringify(updatedItems));
    } else {
      const updatedItems = cartItems.map(item => 
        (item.id === id && item.selectedSize === selectedSize) ? { ...item, qty: newQuantity } : item
      );
      setCartItems(updatedItems);
      localStorage.setItem("gosh_cart", JSON.stringify(updatedItems));
    }
    window.dispatchEvent(new Event("cart-updated"));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
        <Footer />
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={updateCartItemQuantity}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-400" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-600">
              YOUR ORDERS
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-400" />
          </div>

          <h1 className="mb-6 text-5xl font-black sm:text-6xl">
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 bg-clip-text text-transparent">
              MY ORDERS
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            Track and manage your perfume orders
          </p>

          {orders.length > 0 && (
            <button
              onClick={refreshOrders}
              disabled={loading}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-yellow-300/70 bg-white/90 px-6 py-3 text-sm font-bold text-neutral-900 shadow-[0_10px_28px_rgba(234,179,8,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 hover:shadow-[0_16px_35px_rgba(234,179,8,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Package className="h-4 w-4" />
              {loading ? "Refreshing..." : "Refresh Orders"}
            </button>
          )}
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border-2 border-yellow-200/40 bg-white p-12 text-center shadow-lg">
            <Package className="mx-auto mb-4 h-16 w-16 text-yellow-400" />
            <h2 className="mb-2 text-2xl font-bold text-black">No Orders Yet</h2>
            <p className="mb-6 text-zinc-600">
              Start shopping to see your orders here
            </p>
            <button
              onClick={() => router.push("/products")}
              className="rounded-full bg-yellow-400 px-8 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl border-2 border-yellow-200/40 bg-white p-6 shadow-lg transition hover:shadow-xl sm:p-8"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-black">
                      {order.order_number}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Delivery Address
                    </p>
                    <p className="mt-1 text-sm font-semibold text-black">
                      {order.address}, {order.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Payment Method
                    </p>
                    <p className="mt-1 text-sm font-semibold text-black">
                      {order.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Payment Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-black">
                      {order.payment_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Total Amount
                    </p>
                    <p className="mt-1 text-xl font-black text-yellow-600">
                      {order.total.toLocaleString()} MMK
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
      />
    </main>
  );
}
