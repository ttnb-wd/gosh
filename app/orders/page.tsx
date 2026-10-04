"use client";
import devLog from "@/lib/dev-log";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Package, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";

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

interface CartItem {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  image: string;
  qty: number;
  selectedSize?: string;
}

const paymentStatusLabels: Record<string, { label: string; detail: string; className: string }> = {
  Unpaid: {
    label: "Unpaid",
    detail: "Payment is still pending.",
    className: "border-line bg-surface-muted text-secondary",
  },
  Verifying: {
    label: "Verifying",
    detail: "We are checking your payment proof.",
    className: "border-line bg-accent-soft text-accent",
  },
  Paid: {
    label: "Paid",
    detail: "Payment confirmed.",
    className: "border-success bg-success-soft text-success",
  },
  Failed: {
    label: "Failed",
    detail: "Payment could not be verified. Please contact us.",
    className: "border-destructive bg-destructive-soft text-destructive",
  },
  Refunded: {
    label: "Refunded",
    detail: "Refund completed or being processed.",
    className: "border-line bg-surface-muted text-secondary",
  },
};

const toIsoDate = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
};

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem("gosh_cart");
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      } catch (error) {
        devLog.error("Failed to load cart:", error);
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

  // Check authentication (Firebase) and load orders
  useEffect(() => {
    let mounted = true;

    const loadOrdersForUser = async (uid: string) => {
      const ordersQuery = query(
        collection(db, "orders"),
        where("user_id", "==", uid)
      );

      const snapshot = await getDocs(ordersQuery);

      const rows: Order[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;

        return {
          id: doc.id,
          order_number:
            typeof data.order_number === "string"
              ? data.order_number
              : doc.id,
          customer_name:
            typeof data.customer_name === "string" ? data.customer_name : "",
          phone: typeof data.phone === "string" ? data.phone : "",
          address: typeof data.address === "string" ? data.address : "",
          city: typeof data.city === "string" ? data.city : "",
          payment_method:
            typeof data.payment_method === "string" ? data.payment_method : "",
          payment_status:
            typeof data.payment_status === "string" ? data.payment_status : "",
          status: typeof data.status === "string" ? data.status : "",
          total: Number(data.total ?? 0),
          created_at: toIsoDate(data.created_at),
        };
      });

      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (mounted) setOrders(rows);
    };

    const checkAuthAndLoadOrders = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        router.push("/login?redirect=/orders");
        return;
      }

      setUser(currentUser);

      try {
        await loadOrdersForUser(currentUser.uid);
      } catch (error) {
        devLog.error("Failed to load orders:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(() => {
      checkAuthAndLoadOrders();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="h-5 w-5 text-accent" />;
      case "confirmed":
        return <Package className="h-5 w-5 text-info" />;
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-info" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Package className="h-5 w-5 text-secondary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-accent-soft text-accent border-line";
      case "confirmed":
        return "bg-info-soft text-info border-info";
      case "processing":
        return "bg-info-soft text-info border-info";
      case "delivered":
        return "bg-success-soft text-success border-success";
      case "cancelled":
        return "bg-destructive-soft text-destructive border-destructive";
      default:
        return "bg-surface-muted text-secondary border-line";
    }
  };

  const refreshOrders = async () => {
    if (!user) return;

    setLoading(true);

    const loadOrdersByUser = async (uid: string) => {
      const ordersQuery = query(
        collection(db, "orders"),
        where("user_id", "==", uid)
      );

      const snapshot = await getDocs(ordersQuery);

      const rows: Order[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;

        return {
          id: doc.id,
          order_number:
            typeof data.order_number === "string"
              ? data.order_number
              : doc.id,
          customer_name:
            typeof data.customer_name === "string" ? data.customer_name : "",
          phone: typeof data.phone === "string" ? data.phone : "",
          address: typeof data.address === "string" ? data.address : "",
          city: typeof data.city === "string" ? data.city : "",
          payment_method:
            typeof data.payment_method === "string" ? data.payment_method : "",
          payment_status:
            typeof data.payment_status === "string" ? data.payment_status : "",
          status: typeof data.status === "string" ? data.status : "",
          total: Number(data.total ?? 0),
          created_at: toIsoDate(data.created_at),
        };
      });

      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setOrders(rows);
    };

    try {
      await loadOrdersByUser(user.uid);
    } catch (error) {
      devLog.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCartItemQuantity = (id: string | number, selectedSize: string | undefined, newQuantity: number) => {
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
      <main role="main" className="studio-page studio-orders min-h-screen bg-[var(--site-bg)]">
        <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
        {/* Screen Reader Loading Announcement */}
        <div 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
        >
          Loading your orders, please wait...
        </div>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
    <main role="main" className="studio-page studio-orders min-h-screen bg-[var(--site-bg)] text-ink">
      <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      {/* Screen Reader Orders Loaded Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {orders.length === 0 ? "No orders found" : `${orders.length} order${orders.length !== 1 ? 's' : ''} loaded`}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
              YOUR ORDERS
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent" />
          </div>

          <h1 className="studio-gradient mb-6 text-5xl font-semibold sm:text-6xl">
            <span className="bg-gradient-to-r from-accent via-accent to-accent bg-clip-text text-transparent">
              MY ORDERS
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-secondary">
            Track and manage your perfume orders
          </p>

          {orders.length > 0 && (
            <button
              onClick={refreshOrders}
              disabled={loading}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-6 py-3 text-sm font-bold text-ink shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:border-line hover:bg-accent-soft hover:text-accent hover:shadow-panel disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Package className="h-4 w-4" />
              {loading ? "Refreshing..." : "Refresh Orders"}
            </button>
          )}
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-xl border-2 border-line bg-surface p-12 text-center shadow-soft">
            <Package className="mx-auto mb-4 h-16 w-16 text-accent" />
            <h2 className="mb-2 text-2xl font-bold text-ink">No Orders Yet</h2>
            <p className="mb-6 text-secondary">
              Start shopping to see your orders here
            </p>
            <button
              onClick={() => router.push("/products")}
              className="rounded-full bg-brand px-8 py-3 text-sm font-semibold text-on-brand shadow-panel transition hover:bg-brand"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border-2 border-line bg-surface p-6 shadow-soft transition hover:shadow-soft sm:p-8"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-ink">
                      {order.order_number}
                    </h3>
                    <p className="text-sm text-muted">
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

                <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Delivery Address
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {order.address}, {order.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Payment Method
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {order.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Payment Status
                    </p>
                    <div
                      className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        paymentStatusLabels[order.payment_status]?.className || "border-line bg-surface-muted text-secondary"
                      }`}
                    >
                      {paymentStatusLabels[order.payment_status]?.label || order.payment_status}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-secondary">
                      {paymentStatusLabels[order.payment_status]?.detail || "Payment status is being reviewed."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Total Amount
                    </p>
                    <p className="mt-1 text-xl font-semibold text-accent">
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
