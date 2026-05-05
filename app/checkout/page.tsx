"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Check, CheckCircle, Banknote, Building2, Smartphone } from "lucide-react";
import { createSupabaseClient, getSupabaseUser } from "@/lib/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

// Cart item type
interface CartItem {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  image: string;
  qty: number;
  selectedSize?: string;
}

interface SuccessOrder {
  order_number: string;
  phone: string;
  order_items?: unknown;
}

interface SavedOrderItem {
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_brand: string | null;
  product_image: string | null;
  selected_size: string | null;
  price: number;
  quantity: number;
}

interface PlacedOrder extends SuccessOrder {
  id: string;
  customer_name: string;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
}

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const getOrderErrorMessage = (error: SupabaseErrorLike | null | undefined) => {
  if (!error) return "Could not save order. Please refresh and try again.";

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (typeof error.details === "string" && error.details.trim()) {
    return error.details;
  }

  return "Could not save order. Please refresh and try again.";
};

type PaymentDetail = {
  title: string;
  message?: string;
  accountName?: string;
  phone?: string;
  instruction?: string;
  note?: string;
  bankName?: string;
  accountNumber?: string;
};

// Payment Icon Component with Fallback
function PaymentIcon({
  src,
  alt,
  type,
}: {
  src?: string;
  alt: string;
  type: "cod" | "kbzpay" | "wavepay" | "ayapay" | "bank";
}) {
  const [failed, setFailed] = useState(false);

  const fallbackIcon =
    type === "cod" ? (
      <Banknote className="h-10 w-10 text-yellow-700" />
    ) : type === "bank" ? (
      <Building2 className="h-10 w-10 text-yellow-700" />
    ) : (
      <Smartphone className="h-10 w-10 text-yellow-700" />
    );

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-14 w-14 object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
      {fallbackIcon}
    </div>
  );
}

const paymentMethods = [
  {
    id: "cod",
    name: "Cash on Delivery",
    description: "Pay when you receive",
    icon: "/images/cash-on-devlivery.png",
    requiresScreenshot: false
  },
  {
    id: "kbzpay",
    name: "KBZPay",
    description: "Mobile payment",
    icon: "/images/kbzpay.png",
    requiresScreenshot: true
  },
  {
    id: "wavepay",
    name: "WavePay",
    description: "Mobile payment",
    icon: "/images/wave-money.png",
    requiresScreenshot: true
  },
  {
    id: "ayapay",
    name: "AYA Pay",
    description: "Mobile payment",
    icon: "/images/ayapay.png",
    requiresScreenshot: true
  },
  {
    id: "bank",
    name: "Bank Transfer",
    description: "Direct bank transfer",
    icon: "/images/bank-transfer.png",
    requiresScreenshot: true
  }
];

export default function CheckoutPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const { settings } = useSiteSettings();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentScreenshots, setPaymentScreenshots] = useState<Record<string, File | null>>({});
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrder, setSuccessOrder] = useState<SuccessOrder | null>(null);
  const [customerForm, setCustomerForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem("gosh_cart");
        if (!savedCart) {
          setCartItems([]);
          return;
        }
        const parsed = JSON.parse(savedCart);
        const items = Array.isArray(parsed) ? parsed : [];
        setCartItems(items);
      } catch (error) {
        console.error("Failed to load checkout cart:", error);
        setCartItems([]);
      }
    };

    loadCart();

    // Listen for cart updates from other pages
    window.addEventListener("storage", loadCart);
    window.addEventListener("cart-updated", loadCart);

    return () => {
      window.removeEventListener("storage", loadCart);
      window.removeEventListener("cart-updated", loadCart);
    };
  }, []);

  const cartCount = cartItems.reduce((total, item) => total + item.qty, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);

  // Minimum order validation
  const minimumOrderAmount = Number(settings.minimum_order_amount || 0);
  const isBelowMinimumOrder = minimumOrderAmount > 0 && subtotal < minimumOrderAmount;

  // Filter payment methods based on settings
  const availablePaymentMethods = useMemo(() => {
    return paymentMethods.filter((method) => {
      if (method.id === "cod") return settings.allow_cash_on_delivery;
      if (method.id === "kbzpay") return settings.allow_kbzpay;
      if (method.id === "wavepay") return settings.allow_wavepay;
      if (method.id === "ayapay") return settings.allow_ayapay;
      if (method.id === "bank") return settings.allow_bank_transfer;
      return true;
    });
  }, [
    settings.allow_cash_on_delivery,
    settings.allow_kbzpay,
    settings.allow_wavepay,
    settings.allow_ayapay,
    settings.allow_bank_transfer,
  ]);

  // Dynamic grid class based on available payment methods count
  const paymentGridClass = useMemo(() => {
    const count = availablePaymentMethods.length;
    if (count <= 1) {
      return "grid w-full grid-cols-1 justify-items-center gap-5";
    }
    if (count === 2) {
      return "grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 sm:justify-center lg:mx-auto lg:max-w-3xl";
    }
    if (count === 3) {
      return "grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:mx-auto lg:max-w-5xl";
    }
    if (count === 4) {
      return "grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-4";
    }
    return "grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
  }, [availablePaymentMethods.length]);

  // Auto-select first available payment method if current selection is disabled
  useEffect(() => {
    if (availablePaymentMethods.length === 0) {
      setSelectedPayment(null);
      return;
    }
    const stillAvailable = availablePaymentMethods.some((method) => method.id === selectedPayment);
    if (!stillAvailable && selectedPayment !== null) {
      setSelectedPayment(availablePaymentMethods[0].id);
    }
  }, [availablePaymentMethods, selectedPayment]);

  // Payment details data
  const paymentDetails: Record<string, PaymentDetail> = {
    cod: {
      title: "Cash on Delivery",
      message: "Pay when you receive your order.",
    },
    kbzpay: {
      title: "KBZPay Payment Details",
      accountName: settings.kbzpay_account_name || "GOSH PERFUME",
      phone: settings.kbzpay_phone || "09XXXXXXXXX",
      instruction: "Please send payment to this KBZPay number and keep your transaction screenshot.",
      note: "QR payment will be available soon.",
    },
    wavepay: {
      title: "WavePay Payment Details",
      accountName: settings.wavepay_account_name || "GOSH PERFUME",
      phone: settings.wavepay_phone || "09XXXXXXXXX",
      instruction: "Please send payment to this WavePay number and keep your transaction screenshot.",
      note: "QR payment will be available soon.",
    },
    ayapay: {
      title: "AYA Pay Payment Details",
      accountName: settings.ayapay_account_name || "GOSH PERFUME",
      phone: settings.ayapay_phone || "09XXXXXXXXX",
      instruction: "Please send payment to this AYA Pay number and keep your transaction screenshot.",
      note: "QR payment will be available soon.",
    },
    bank: {
      title: "Bank Transfer Details",
      bankName: settings.bank_name || "KBZ Bank",
      accountName: settings.bank_account_name || "GOSH PERFUME",
      accountNumber: settings.bank_account_number || "XXXXXXXXXXXXX",
      instruction: "Please transfer to this bank account and keep your payment screenshot.",
    },
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("gosh_cart");
    window.dispatchEvent(new Event("cart-updated"));
  };

  const uploadPaymentScreenshot = async () => {
    const selectedFile = selectedPayment ? paymentScreenshots[selectedPayment] : null;
    if (!selectedFile) {
      return null;
    }

    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `guest-orders/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-screenshots")
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Payment screenshot upload error:", {
        message: uploadError.message,
        name: uploadError.name,
      });
      throw uploadError;
    }

    return filePath;
  };

  const deleteUploadedPaymentScreenshot = async (filePath: string | null) => {
    if (!filePath) return;

    const { error: deleteError } = await supabase.storage
      .from("payment-screenshots")
      .remove([filePath]);

    if (deleteError) {
      // Payment screenshot cleanup failed (non-critical)
    }
  };

  const submitGuestOrder = async () => {
    setSubmitError("");
    setSubmittingOrder(true);

    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: userError,
      } = await getSupabaseUser(supabase);

      if (userError || !user) {
        setSubmitError("Please login or create an account to place your order.");
        setSubmittingOrder(false);
        router.push("/login?redirect=/checkout");
        return;
      }

      const nextErrors: Record<string, string> = {};
      if (!customerForm.fullName?.trim()) nextErrors.fullName = "Name is required";
      if (!customerForm.phone?.trim()) nextErrors.phone = "Phone is required";
      if (!customerForm.address?.trim()) nextErrors.address = "Address is required";
      if (!customerForm.city?.trim()) nextErrors.city = "City is required";
      if (!selectedPayment) nextErrors.payment = "Please select a payment method";
      if (!cartItems || cartItems.length === 0) nextErrors.cart = "Your bag is empty";

      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        setSubmitError("Please complete the required checkout information.");
        setSubmittingOrder(false);
        return;
      }

      const paymentInfo = {
        cod: {
          payment_method: "cod",
          payment_status: "Unpaid",
          payment_account_name: null,
          payment_phone: null,
          payment_account_number: null,
        },
        kbzpay: {
          payment_method: "kbzpay",
          payment_status: "Verifying",
          payment_account_name: settings.kbzpay_account_name || "GOSH PERFUME",
          payment_phone: settings.kbzpay_phone || "09XXXXXXXXX",
          payment_account_number: null,
        },
        wavepay: {
          payment_method: "wavepay",
          payment_status: "Verifying",
          payment_account_name: settings.wavepay_account_name || "GOSH PERFUME",
          payment_phone: settings.wavepay_phone || "09XXXXXXXXX",
          payment_account_number: null,
        },
        ayapay: {
          payment_method: "ayapay",
          payment_status: "Verifying",
          payment_account_name: settings.ayapay_account_name || "GOSH PERFUME",
          payment_phone: settings.ayapay_phone || "09XXXXXXXXX",
          payment_account_number: null,
        },
        bank: {
          payment_method: "bank",
          payment_status: "Verifying",
          payment_account_name: settings.bank_account_name || "GOSH PERFUME",
          payment_phone: null,
          payment_account_number: settings.bank_account_number || "XXXXXXXXXXXXX",
        },
      } as const;

      const selectedPaymentInfo = paymentInfo[selectedPayment as keyof typeof paymentInfo];

      if (!selectedPaymentInfo) {
        setSubmitError("Invalid payment method.");
        setSubmittingOrder(false);
        return;
      }

      const paymentScreenshotUrl = await uploadPaymentScreenshot();

      const orderItemsPayload = cartItems.map((item) => ({
        product_id: String(item.id),
        selected_size: item.selectedSize || null,
        quantity: Number(item.qty || 1),
      }));

      const { data: savedOrderData, error: orderError } = await supabase
        .rpc("place_order", {
          p_customer_name: customerForm.fullName,
          p_phone: customerForm.phone,
          p_address: customerForm.address,
          p_city: customerForm.city,
          p_payment_method: selectedPaymentInfo.payment_method,
          p_payment_account_name: selectedPaymentInfo.payment_account_name,
          p_payment_phone: selectedPaymentInfo.payment_phone,
          p_payment_account_number: selectedPaymentInfo.payment_account_number,
          p_payment_screenshot_url: paymentScreenshotUrl,
          p_items: orderItemsPayload,
        });

      const savedOrder = Array.isArray(savedOrderData) ? savedOrderData[0] : savedOrderData;

      if (orderError || !savedOrder) {
        const orderMessage = getOrderErrorMessage(orderError);

        await deleteUploadedPaymentScreenshot(paymentScreenshotUrl);

        // Order was not saved - keeping error for debugging
        setSubmitError(orderMessage);
        setSubmittingOrder(false);
        return;
      }

      const order = savedOrder as PlacedOrder;

      const { data: trustedOrderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("order_id, product_id, product_name, product_brand, product_image, selected_size, price, quantity")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (orderItemsError) {
        // Trusted order items fetch failed (non-critical, will use empty array)
      }

      const savedOrderItems = ((trustedOrderItems || []) as SavedOrderItem[]).map((item) => ({
        ...item,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      }));

      void supabase.auth.getSession().then((response: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
        const { data } = response;
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        return fetch("/api/email/order-created", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        }).catch((emailError) => {
          console.error("Order email notification failed:", emailError);
        });
      });

      // NOTE: Admin notifications are now created by Supabase database triggers
      // This prevents duplicate notifications from frontend + backend sources

      // Save to localStorage as backup
      const localOrders = JSON.parse(localStorage.getItem("gosh_orders") || "[]");
      localStorage.setItem(
        "gosh_orders",
        JSON.stringify([
          {
            ...order,
            order_items: savedOrderItems,
          },
          ...localOrders,
        ])
      );

      setShowPaymentModal(false);
      setSuccessOrder({
        ...order,
        order_items: savedOrderItems,
      });
      setShowSuccessModal(true);
      clearCart();

    } catch (error) {
      console.error("Checkout submit unexpected error:", error);
      setSubmitError("Could not place order. Please try again.");
      setSubmittingOrder(false);
    } finally {
      setSubmittingOrder(false);
    }
  };

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

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handlePaymentScreenshotUpload = (paymentId: string, file: File | null) => {
    setPaymentScreenshots((prev) => ({
      ...prev,
      [paymentId]: file,
    }));
  };

  // Disable body scroll when modal is open
  useEffect(() => {
    if (showPaymentModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showPaymentModal]);

  return (
    <main role="main" className="min-h-screen bg-white text-black">
      <Navbar 
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Premium Payment Header */}
          <div className="mb-16 text-center">
            {/* Top Label */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-400" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-600">
                SAFE • SECURE • CONVENIENT
              </p>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-400" />
            </div>

            {/* Main Heading */}
            <h1 className="mb-6 text-3xl font-black sm:text-5xl lg:text-7xl">
              <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 bg-clip-text text-transparent">
                CHECKOUT
              </span>
            </h1>

            {/* Divider with accent */}
            <div className="mx-auto mb-6 flex items-center justify-center gap-3">
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-zinc-200 to-zinc-200" />
              <div className="h-2 w-2 rotate-45 bg-yellow-400" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent via-zinc-200 to-zinc-200" />
            </div>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-base text-zinc-600 leading-relaxed sm:text-lg">
              Complete your order with secure payment
            </p>
          </div>

          {/* Customer Information Form */}
          <div className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-black">Delivery Information</h2>
            <div className="mx-auto max-w-3xl rounded-3xl border-2 border-yellow-200/40 bg-white p-8 shadow-lg">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="customer-fullname" className="mb-2 block text-sm font-bold text-neutral-800">
                    Full Name *
                  </label>
                  <input
                    id="customer-fullname"
                    name="fullName"
                    type="text"
                    value={customerForm.fullName}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="John Doe"
                  />
                  {errors.fullName && (
                    <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customer-phone" className="mb-2 block text-sm font-bold text-neutral-800">
                    Phone Number *
                  </label>
                  <input
                    id="customer-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="09XXXXXXXXX"
                  />
                  {errors.phone && (
                    <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customer-email" className="mb-2 block text-sm font-bold text-neutral-800">
                    Email (Optional)
                  </label>
                  <input
                    id="customer-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="customer-address" className="mb-2 block text-sm font-bold text-neutral-800">
                    Address *
                  </label>
                  <input
                    id="customer-address"
                    name="address"
                    type="text"
                    autoComplete="street-address"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="Street address, building, floor"
                  />
                  {errors.address && (
                    <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{errors.address}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="customer-city" className="mb-2 block text-sm font-bold text-neutral-800">
                    City *
                  </label>
                  <input
                    id="customer-city"
                    name="city"
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="Yangon"
                  />
                  {errors.city && (
                    <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{errors.city}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-8">
            <h2 className="mb-6 text-2xl font-bold text-black">Select Payment Method</h2>
            {errors.payment && (
              <p role="alert" className="mb-4 text-sm font-semibold text-red-600">{errors.payment}</p>
            )}
          </div>

          {/* Premium Payment Cards - Dynamic responsive grid */}
          <div className="mb-16">
            {availablePaymentMethods.length === 0 ? (
              <div className="rounded-[28px] border border-yellow-200 bg-yellow-50 p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-neutral-950">No payment methods available</h3>
                <p className="mt-2 text-sm font-medium text-neutral-600">
                  Please contact the store or try again later.
                </p>
              </div>
            ) : (
              <div className={paymentGridClass}>
                {availablePaymentMethods.map((method, index) => {
                const isSelected = selectedPayment === method.id;

                return (
                  <motion.button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedPayment(method.id);
                      setShowPaymentModal(true);
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative w-full max-w-[280px]"
                  >
                    {/* Rounded White Card with Gold Border */}
                    <div className={`relative flex h-[320px] w-full flex-col items-center overflow-visible rounded-2xl border-2 bg-white p-6 transition-all duration-300 ${
                      isSelected
                        ? "border-yellow-400 shadow-2xl shadow-yellow-400/40"
                        : "border-yellow-300/50 shadow-lg hover:border-yellow-400 hover:shadow-2xl hover:shadow-yellow-400/30"
                    }`}>
                      {/* Soft ambient glow */}
                      <div className={`pointer-events-none absolute -inset-3 rounded-2xl bg-gradient-to-br from-yellow-400/0 via-yellow-300/30 to-yellow-400/0 opacity-0 blur-2xl transition-opacity duration-500 ${
                        isSelected ? "opacity-100" : "group-hover:opacity-80"
                      }`} />

                      {/* Selected check badge */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-400/60"
                        >
                          <Check className="h-4 w-4 text-black font-bold" />
                        </motion.div>
                      )}

                      {/* Circular Icon Area */}
                      <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                        {/* Outer glow ring */}
                        <motion.div
                          animate={{ 
                            rotate: isSelected ? 360 : 0,
                            scale: isSelected ? [1, 1.08, 1] : 1
                          }}
                          transition={{ 
                            rotate: { duration: 25, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2.5, repeat: Infinity }
                          }}
                          className={`pointer-events-none absolute inset-0 rounded-full border border-dashed transition-colors duration-300 ${
                            isSelected ? "border-yellow-400/60" : "border-yellow-300/40 group-hover:border-yellow-400/60"
                          }`}
                        />

                        {/* Soft glow effect */}
                        <div className={`pointer-events-none absolute inset-1 rounded-full transition-all duration-300 ${
                          isSelected 
                            ? "bg-gradient-to-br from-yellow-400/30 to-yellow-500/30 blur-lg" 
                            : "bg-gradient-to-br from-yellow-200/20 to-yellow-300/20 blur-lg group-hover:from-yellow-400/30 group-hover:to-yellow-500/30"
                        }`} />

                        {/* Icon circle container */}
                        <div className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                          isSelected
                            ? "border-yellow-400/40 bg-gradient-to-br from-yellow-50 via-white to-yellow-50 shadow-xl shadow-yellow-400/50"
                            : "border-yellow-300/30 bg-gradient-to-br from-white via-yellow-50/30 to-white shadow-lg group-hover:border-yellow-400/50 group-hover:shadow-xl group-hover:shadow-yellow-400/40"
                        }`}>
                          {/* Inner shine overlay */}
                          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/70 via-transparent to-transparent" />
                          
                          {/* Payment Icon with Fallback */}
                          <PaymentIcon
                            src={method.icon}
                            alt={method.name}
                            type={method.id as "cod" | "kbzpay" | "wavepay" | "ayapay" | "bank"}
                          />
                        </div>

                        {/* Sparkle decorations */}
                        <motion.div
                          animate={{ 
                            scale: [1, 1.4, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-md shadow-yellow-400/70"
                        />
                        <motion.div
                          animate={{ 
                            scale: [1, 1.3, 1],
                            opacity: [0.4, 0.9, 0.4]
                          }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                          className="pointer-events-none absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-yellow-300 shadow-sm shadow-yellow-300/70"
                        />
                      </div>

                      {/* Payment Label */}
                      <div className="relative text-center">
                        <h3 className={`mb-2.5 min-h-[48px] flex items-center justify-center text-base font-bold transition-colors duration-300 ${
                          isSelected ? "text-black" : "text-zinc-800 group-hover:text-black"
                        }`}>
                          {method.name}
                        </h3>
                        
                        {/* Small Gold Underline */}
                        <div className="mx-auto mb-3 flex items-center justify-center gap-1">
                          <div className={`h-px w-6 rounded-full transition-all duration-300 ${
                            isSelected 
                              ? "bg-gradient-to-r from-transparent via-yellow-400 to-yellow-400" 
                              : "bg-gradient-to-r from-transparent via-yellow-300 to-yellow-300 group-hover:via-yellow-400"
                          }`} />
                          <div className={`h-1 w-1 rounded-full transition-all duration-300 ${
                            isSelected ? "bg-yellow-400" : "bg-yellow-300 group-hover:bg-yellow-400"
                          }`} />
                          <div className={`h-px w-6 rounded-full transition-all duration-300 ${
                            isSelected 
                              ? "bg-gradient-to-l from-transparent via-yellow-400 to-yellow-400" 
                              : "bg-gradient-to-l from-transparent via-yellow-300 to-yellow-300 group-hover:via-yellow-400"
                          }`} />
                        </div>

                        {/* Description */}
                        <p className="min-h-[32px] text-xs text-zinc-500 leading-relaxed">
                          {method.description}
                        </p>
                      </div>

                      {/* Bottom soft glow */}
                      <div className={`pointer-events-none absolute bottom-0 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-full transition-opacity duration-300 ${
                        isSelected 
                          ? "bg-gradient-to-t from-yellow-400/25 to-transparent blur-xl opacity-100" 
                          : "bg-gradient-to-t from-yellow-300/15 to-transparent blur-xl opacity-0 group-hover:opacity-100"
                      }`} />
                    </div>
                  </motion.button>
                );
              })}
              </div>
            )}
          </div>

          {/* Trust/Protection Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-12"
          >
            <div className="mx-auto max-w-2xl rounded-3xl border-2 border-yellow-200/40 bg-gradient-to-br from-yellow-50/50 via-white to-white p-8 text-center shadow-lg">
              {/* Shield icon */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-400/30">
                <svg className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>

              {/* Text */}
              <h4 className="mb-2 text-xl font-bold text-black">
                Your payments are protected
              </h4>
              
              {/* Decorative divider */}
              <div className="mx-auto mb-3 flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-400" />
                <div className="h-1.5 w-1.5 rotate-45 bg-yellow-400" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-400" />
              </div>

              {/* Subtext */}
              <p className="text-sm font-medium text-zinc-600">
                <span className="text-yellow-600">Encrypted</span> • <span className="text-yellow-600">Trusted</span> • <span className="text-yellow-600">Secure</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <Footer />

      <CartDrawer 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
      />

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && successOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] bg-black/55 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md overflow-hidden rounded-[28px] border border-yellow-300/70 bg-[#fffdf6] shadow-[0_30px_100px_rgba(0,0,0,0.35),0_0_45px_rgba(234,179,8,0.25)]"
              >
                <div className="p-8 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 shadow-lg shadow-green-400/30">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="mb-3 text-2xl font-black text-black">Order Placed Successfully!</h2>
                  <p className="mb-2 text-sm text-zinc-600">
                    Your order has been received and is being processed.
                  </p>
                  <p className="mb-6 text-sm text-zinc-600">
                    We&apos;ll contact you at <span className="font-semibold text-black">{successOrder.phone}</span> to confirm delivery.
                  </p>
                  
                  <div className="mb-6 rounded-2xl border border-yellow-200 bg-white p-4 text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Order Number</p>
                    <p className="mt-1 text-lg font-black text-yellow-600">{successOrder.order_number}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push("/products");
                    }}
                    className="w-full rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300"
                  >
                    Continue Shopping
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && paymentDetails[selectedPayment] && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-5 backdrop-blur-md"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-[10000] mx-auto flex max-h-[82vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] border border-yellow-300/70 bg-[#fffdf6] shadow-[0_30px_100px_rgba(0,0,0,0.28),0_0_45px_rgba(234,179,8,0.28)]"
          >
            {/* Header */}
            <div className="relative z-[10001] shrink-0 border-b border-yellow-200/70 bg-[#fffdf6]/95 px-6 py-5 backdrop-blur">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPaymentModal(false);
                }}
                className="absolute right-4 top-4 z-[10002] flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-lg font-bold text-black shadow-[0_8px_24px_rgba(234,179,8,0.45)] transition hover:scale-105 hover:bg-yellow-300"
                aria-label="Close payment details"
              >
                ×
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-600">Secure Payment</p>
              <h2 className="mt-2 pr-12 text-2xl font-bold leading-tight text-neutral-950 sm:text-3xl">
                {paymentDetails[selectedPayment].title}
              </h2>
              <div className="pointer-events-none mt-4 h-px w-20 bg-gradient-to-r from-yellow-400 to-transparent" />
            </div>

            {/* Body */}
            <div className="scrollbar-auto-hide min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 overscroll-contain">
              {/* Cash on Delivery */}
              {selectedPayment === "cod" && (
                <>
                  <div className="rounded-2xl border border-yellow-200/80 bg-white/80 p-5 shadow-[0_10px_30px_rgba(234,179,8,0.08)] text-center">
                    <p className="text-base font-semibold text-neutral-800 leading-relaxed">
                      {paymentDetails[selectedPayment].message}
                    </p>
                  </div>
                  <div className="mt-4 rounded-2xl bg-yellow-50/60 p-4">
                    <p className="text-sm leading-6 text-neutral-600 text-center">
                      Our delivery team will collect payment upon delivery of your perfume.
                    </p>
                  </div>
                </>
              )}

              {/* Mobile Payment Methods (KBZPay, WavePay, AYA Pay) */}
              {(selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay") && (
                <>
                  <div className="rounded-2xl border border-yellow-200/80 bg-white/80 p-4 shadow-[0_10px_30px_rgba(234,179,8,0.08)]">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Account Name</span>
                        <span className="text-sm font-bold text-neutral-950 sm:text-base">{paymentDetails[selectedPayment].accountName}</span>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Phone</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-950 sm:text-base">{paymentDetails[selectedPayment].phone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentDetails[selectedPayment].phone ?? "", "phone")}
                            className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700 transition hover:bg-yellow-100"
                          >
                            {copiedField === "phone" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-yellow-50/60 p-4">
                    <p className="text-sm leading-6 text-neutral-600">
                      <span className="font-bold text-yellow-700">Instruction: </span>
                      {paymentDetails[selectedPayment].instruction}
                    </p>
                  </div>
                  {paymentDetails[selectedPayment].note && (
                    <p className="mt-4 text-center text-xs italic text-neutral-400">{paymentDetails[selectedPayment].note}</p>
                  )}
                </>
              )}

              {/* Bank Transfer */}
              {selectedPayment === "bank" && (
                <>
                  <div className="rounded-2xl border border-yellow-200/80 bg-white/80 p-4 shadow-[0_10px_30px_rgba(234,179,8,0.08)]">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Bank Name</span>
                        <span className="text-sm font-bold text-neutral-950 sm:text-base">{paymentDetails[selectedPayment].bankName}</span>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Account Name</span>
                        <span className="text-sm font-bold text-neutral-950 sm:text-base">{paymentDetails[selectedPayment].accountName}</span>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Account Number</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-950 sm:text-base">{paymentDetails[selectedPayment].accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentDetails[selectedPayment].accountNumber ?? "", "accountNumber")}
                            className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700 transition hover:bg-yellow-100"
                          >
                            {copiedField === "accountNumber" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-yellow-50/60 p-4">
                    <p className="text-sm leading-6 text-neutral-600">
                      <span className="font-bold text-yellow-700">Instruction: </span>
                      {paymentDetails[selectedPayment].instruction}
                    </p>
                  </div>
                </>
              )}

              {/* Payment Screenshot Upload */}
              {selectedPayment && ["kbzpay", "wavepay", "ayapay", "bank"].includes(selectedPayment) && (
                <div className="mt-5 rounded-2xl border border-yellow-200/80 bg-white/80 p-4 shadow-[0_10px_30px_rgba(234,179,8,0.08)]">
                  <p className="text-sm font-bold text-neutral-950">Upload payment screenshot</p>
                  <p className="mt-1 text-xs text-neutral-500">Attach your transaction screenshot after payment.</p>
                  
                  <label htmlFor={`payment-screenshot-${selectedPayment}`} className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-yellow-300 bg-yellow-50/50 px-4 py-4 text-center transition hover:bg-yellow-50">
                    <span className="text-2xl text-yellow-600">☁</span>
                    <span className="mt-1 text-sm font-bold text-yellow-700">Choose screenshot</span>
                    <span className="mt-1 text-xs text-neutral-500">PNG, JPG, JPEG, WEBP</span>
                    <input
                      id={`payment-screenshot-${selectedPayment}`}
                      name={`paymentScreenshot_${selectedPayment}`}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        handlePaymentScreenshotUpload(selectedPayment, file);
                      }}
                    />
                  </label>

                  {paymentScreenshots[selectedPayment] && (
                    <div className="mt-4 rounded-2xl border border-yellow-100 bg-white p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="truncate text-xs font-semibold text-neutral-600 flex-1 pr-2">
                          {paymentScreenshots[selectedPayment]!.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handlePaymentScreenshotUpload(selectedPayment, null)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap"
                        >
                          Remove
                        </button>
                      </div>
                      <img
                        src={URL.createObjectURL(paymentScreenshots[selectedPayment]!)}
                        alt="Payment screenshot preview"
                        className="mt-3 max-h-36 w-full rounded-xl object-contain"
                      />
                    </div>
                  )}

                  <p className="mt-3 rounded-xl bg-yellow-50/60 px-3 py-2 text-center text-xs italic text-neutral-500">
                    Your screenshot is only used to verify your payment.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="relative z-[10002] shrink-0 border-t border-yellow-200/70 bg-[#fffdf6]/95 px-6 py-4 backdrop-blur">
              {/* Validation Helper Functions */}
              {(() => {
                const getCustomerValue = (keys: string[]) => {
                  for (const key of keys) {
                    const value = customerForm?.[key as keyof typeof customerForm];
                    if (typeof value === "string" && value.trim()) {
                      return value.trim();
                    }
                  }
                  return "";
                };

                const normalizedCustomer = {
                  fullName: getCustomerValue(["fullName", "name", "customerName"]),
                  phone: getCustomerValue(["phone", "phoneNumber", "mobile"]),
                  address: getCustomerValue(["address", "shippingAddress"]),
                  city: getCustomerValue(["city", "township", "state"]),
                  email: getCustomerValue(["email"]),
                };

                const requiresScreenshot =
                  selectedPayment === "kbzpay" ||
                  selectedPayment === "wavepay" ||
                  selectedPayment === "ayapay" ||
                  selectedPayment === "bank";

                const selectedPaymentScreenshot = selectedPayment
                  ? paymentScreenshots[selectedPayment]
                  : null;

                const isPaymentReady =
                  Boolean(normalizedCustomer.fullName) &&
                  Boolean(normalizedCustomer.phone) &&
                  Boolean(normalizedCustomer.address) &&
                  Boolean(normalizedCustomer.city) &&
                  Boolean(selectedPayment) &&
                  cartItems.length > 0 &&
                  (!requiresScreenshot || Boolean(selectedPaymentScreenshot)) &&
                  !isBelowMinimumOrder &&
                  settings.enable_checkout;

                const confirmDisabled = submittingOrder || !isPaymentReady;

                return (
                  <>
                    {/* Checkout disabled message */}
                    {!settings.enable_checkout && (
                      <div role="alert" className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        Checkout is currently unavailable.
                      </div>
                    )}

                    {/* Minimum order amount message */}
                    {isBelowMinimumOrder && (
                      <div role="alert" className="mb-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-700">
                        Minimum order amount is {minimumOrderAmount.toLocaleString()} MMK.
                      </div>
                    )}

                    {/* No payment methods available */}
                    {availablePaymentMethods.length === 0 && (
                      <div role="alert" className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        No payment methods are currently available.
                      </div>
                    )}

                    {/* Helper message for screenshot requirement */}
                    {requiresScreenshot && !selectedPaymentScreenshot && (
                      <div role="alert" className="mb-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-700">
                        Upload your payment screenshot to continue.
                      </div>
                    )}

                    {/* Error message */}
                    {submitError && (
                      <div role="alert" className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="button"
                      aria-label="Confirm payment and place order"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!isPaymentReady) {
                          const nextErrors: Record<string, string> = {};
                          if (!normalizedCustomer.fullName) nextErrors.fullName = "Name is required";
                          if (!normalizedCustomer.phone) nextErrors.phone = "Phone is required";
                          if (!normalizedCustomer.address) nextErrors.address = "Address is required";
                          if (!normalizedCustomer.city) nextErrors.city = "City / Township is required";
                          if (!selectedPayment) nextErrors.payment = "Please select a payment method";
                          if (!cartItems.length) nextErrors.cart = "Your bag is empty";
                          if (requiresScreenshot && !selectedPaymentScreenshot) {
                            nextErrors.screenshot = "Please upload your payment screenshot";
                          }
                          setErrors(nextErrors);
                          setSubmitError(Object.values(nextErrors).join(" • "));
                          return;
                        }

                        void submitGuestOrder();
                      }}
                      disabled={confirmDisabled}
                      className={`relative z-[10003] w-full rounded-full px-5 py-3 text-sm font-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition pointer-events-auto ${
                        confirmDisabled
                          ? "cursor-not-allowed bg-neutral-200 text-neutral-500 shadow-none"
                          : "bg-yellow-400 text-black hover:bg-yellow-300"
                      }`}
                    >
                      {submittingOrder
                        ? "Placing Order..."
                        : selectedPayment === "cod"
                        ? "Confirm Cash on Delivery"
                        : "Confirm Payment & Place Order"}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
