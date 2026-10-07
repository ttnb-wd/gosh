"use client";
import StudioErrorText from "@/components/ui/StudioErrorText";
import StudioModal from "@/components/ui/StudioModal";
import devLog from "@/lib/dev-log";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Check, CheckCircle, Banknote, Building2, Smartphone } from "lucide-react";
import { getFirebaseAuthorizationHeader } from "@/lib/firebase/client-auth";
import { auth } from "@/lib/firebase/config";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { PageErrorBoundary } from "@/components/ErrorBoundaries";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

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
  payment_method?: string;
  payment_status?: string;
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

type OrderErrorResponse = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const getOrderErrorMessage = (error: OrderErrorResponse | null | undefined) => {
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
  qrImage?: string;
  instruction?: string;
  secondaryInstruction?: string;
  note?: string;
  bankName?: string;
  accountNumber?: string;
};

const KBZPAY_ACCOUNT_NAME = "Khant Lin Htet";
const KBZPAY_PHONE = "09777460056";
const KBZPAY_QR_IMAGE = "/images/payment/kbz-qr.jpg.jpg";
const WAVEPAY_ACCOUNT_NAME = "Khant Lin Htet";
const WAVEPAY_PHONE = "09777460056";
const WAVEPAY_QR_IMAGE = "/images/payment/wavepay-qr.jpg.jpg";
const AYAPAY_ACCOUNT_NAME = "Khant Lin Htet";
const AYAPAY_PHONE = "09777460056";
const AYAPAY_QR_IMAGE = "/images/payment/ayapay-qr.jpg.jpg";

// Temporarily hide COD payment promo card from UI (can be restored later)
const SHOW_COD_PAYMENT_CARD = false;

// Temporarily hide Delivery Information form from UI (can be restored later)
const SHOW_DELIVERY_INFORMATION = false;

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
      <Banknote className="h-7 w-7 text-accent sm:h-10 sm:w-10" />
    ) : type === "bank" ? (
      <Building2 className="h-7 w-7 text-accent sm:h-10 sm:w-10" />
    ) : (
      <Smartphone className="h-7 w-7 text-accent sm:h-10 sm:w-10" />
    );

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-10 w-10 rounded-full object-cover sm:h-14 sm:w-14"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const fixedLightFallbackSurface = type === "kbzpay" || type === "bank";

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft sm:h-14 sm:w-14 ${
      fixedLightFallbackSurface
        ? ""
        : "   "
    }`}>
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

async function deleteUploadedPaymentScreenshot(fileId: string | null) {
  if (!fileId) return true;
  try {
    const headers = await getFirebaseAuthorizationHeader();
    const response = await fetch("/api/checkout/delete-payment-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ fileId }),
    });
    if (!response.ok) devLog.warn("Payment proof cleanup could not be completed.");
    return response.ok;
  } catch {
    devLog.error("Failed to delete payment screenshot.");
    return false;
  }
}

type CheckoutAttempt = { userId: string; key: string; body: string };
const CHECKOUT_ATTEMPT_STORAGE = "gosh_checkout_attempt";
function saveCheckoutAttempt(attempt: CheckoutAttempt | null) {
  try {
    if (attempt) sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE, JSON.stringify(attempt));
    else sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE);
  } catch {
    devLog.warn("Checkout retry backup is unavailable; the current page retains the attempt.");
  }
}
function restoreCheckoutAttempt(): CheckoutAttempt | null {
  try {
    const stored = sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE);
    if (!stored) return null;
    const value = JSON.parse(stored) as Partial<CheckoutAttempt>;
    if (typeof value.userId !== "string" || typeof value.key !== "string" ||
      !/^[A-Za-z0-9_-]{1,200}$/.test(value.key) || typeof value.body !== "string" || value.body.length > 65536) return null;
    const body = JSON.parse(value.body);
    if (!paymentMethods.some(method => method.id === body?.paymentMethod)) return null;
    return value as CheckoutAttempt;
  } catch {
    return null;
  }
}

function CheckoutPageContent() {
  const router = useRouter();
  const { settings } = useSiteSettings();
  const { settings: websiteSettings } = useWebsiteSettings();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentScreenshots, setPaymentScreenshots] = useState<Record<string, File | null>>({});
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const submitInFlight = useRef(false);
  const orderCompleted = useRef(false);
  const orderAttempt = useRef<CheckoutAttempt | null>(null);
  const uploadedProof = useRef<{ file: File; fileId: string } | null>(null);
  const [orderPending, setOrderPending] = useState(false);
  const checkoutLocked = submittingOrder || orderPending;
  const showSubmitLoading = useDelayedLoading(submittingOrder, 400);
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

  useEffect(() => () => {
    // Keep an ambiguous attempt's proof for retry. Otherwise clean up an unused
    // completed upload on navigation; the API still prevents deleting used proof.
    if (!orderAttempt.current) {
      void deleteUploadedPaymentScreenshot(uploadedProof.current?.fileId ?? null);
    }
  }, []);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      // Keep the visible cart consistent with an in-flight or unresolved request.
      if (submitInFlight.current || orderAttempt.current) return;
      try {
        const savedCart = localStorage.getItem("gosh_cart");
        if (!savedCart) {
          setCartItems([]);
          return;
        }
        const parsed = JSON.parse(savedCart);
        const items = Array.isArray(parsed) ? parsed : [];
        if (items.length > 0) orderCompleted.current = false;
        setCartItems(items);
      } catch (error) {
        devLog.error("Failed to load checkout cart:", error);
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

  useEffect(() => {
    const attempt = restoreCheckoutAttempt();
    if (!attempt || (auth.currentUser && auth.currentUser.uid !== attempt.userId)) return;
    orderAttempt.current = attempt;
    setOrderPending(true);
    setSelectedPayment(JSON.parse(attempt.body).paymentMethod);
    setShowPaymentModal(true);
    setSubmitError("An order confirmation is pending. Please retry to check the same order.");
  }, []);

  const cartCount = cartItems.reduce((total, item) => total + item.qty, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const deliveryNote = websiteSettings.delivery_note?.trim();

  // Minimum order validation
  const minimumOrderAmount = Number(settings.minimum_order_amount || 0);
  const isBelowMinimumOrder = minimumOrderAmount > 0 && subtotal < minimumOrderAmount;

  // Filter payment methods based on settings
  const availablePaymentMethods = useMemo(() => {
    return paymentMethods.filter((method) => {
      // Hide COD card from UI if flag is false (can be restored later)
      if (method.id === "cod" && !SHOW_COD_PAYMENT_CARD) return false;

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
    return "grid w-full grid-cols-2 gap-3 lg:grid-cols-4";
  }, [availablePaymentMethods.length]);

  // Auto-select first available payment method if current selection is disabled
  useEffect(() => {
    if (orderAttempt.current) return;
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
      accountName: KBZPAY_ACCOUNT_NAME,
      phone: KBZPAY_PHONE,
      qrImage: KBZPAY_QR_IMAGE,
      instruction: "Scan this QR with KBZPay and complete your payment.",
      secondaryInstruction: "After payment, please send the payment screenshot or transaction ID.",
    },
    wavepay: {
      title: "WavePay Payment Details",
      accountName: WAVEPAY_ACCOUNT_NAME,
      phone: WAVEPAY_PHONE,
      qrImage: WAVEPAY_QR_IMAGE,
      instruction: "Please send payment to this WavePay number and keep your transaction screenshot.",
      note: "QR payment will be available soon.",
    },
    ayapay: {
      title: "AYA Pay Payment Details",
      accountName: AYAPAY_ACCOUNT_NAME,
      phone: AYAPAY_PHONE,
      qrImage: AYAPAY_QR_IMAGE,
      instruction: "Please send payment to this AYA Pay number and keep your transaction screenshot.",
      note: "QR payment will be available soon.",
    },
    bank: {
      title: "Bank Transfer Details",
      bankName: settings.bank_name || "KBZ Bank",
      accountName: settings.bank_account_name || "GOSH PERFUME",
      accountNumber: settings.bank_account_number || "",
      instruction: "Please transfer to this bank account and keep your payment screenshot.",
    },
  };

  const clearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem("gosh_cart");
    } catch {
      devLog.warn("Checkout cart backup could not be cleared.");
    }
    window.dispatchEvent(new Event("cart-updated"));
  };

  const uploadPaymentProof = async (
    authorizationHeader: Record<string, string>
  ): Promise<{ fileId: string } | null> => {
    const selectedFile = selectedPayment
      ? paymentScreenshots[selectedPayment]
      : null;

    if (!selectedFile) {
      return null;
    }

    if (uploadedProof.current?.file === selectedFile) {
      return { fileId: uploadedProof.current.fileId };
    }
    if (uploadedProof.current) {
      // Replace only an unattached proof, through the existing ownership-checked API.
      if (!await deleteUploadedPaymentScreenshot(uploadedProof.current.fileId)) {
        throw new Error("Could not replace your payment proof. Please try again.");
      }
      uploadedProof.current = null;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("/api/checkout/upload-payment-proof", {
      method: "POST",
      headers: authorizationHeader,
      body: formData,
    });

    const result = (await response.json()) as {
      success?: boolean;
      fileId?: string;
      error?: string;
    };

    if (!response.ok || !result.success || !result.fileId) {
      throw new Error(result.error || "Could not upload your payment proof.");
    }

    // Only the fileId is returned — the public ImageKit URL is never exposed.
    // The receipt is served later through the authenticated proxy route.
    uploadedProof.current = { file: selectedFile, fileId: result.fileId };
    return { fileId: result.fileId };
  };

  const submitGuestOrder = async () => {
    // React state disables the button after render; this guard locks immediately.
    if (submitInFlight.current || orderCompleted.current) return;
    submitInFlight.current = true;
    setSubmitError("");
    setSubmittingOrder(true);

    try {
      // Check if user is authenticated via Firebase
      let authorizationHeader: Record<string, string>;

      try {
        authorizationHeader = await getFirebaseAuthorizationHeader();
      } catch {
        setSubmitError("Please login or create an account to place your order.");
        setSubmittingOrder(false);
        router.push("/login?redirect=/checkout");
        return;
      }
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error("Sign in required.");
      if (orderAttempt.current && orderAttempt.current.userId !== userId) {
        orderAttempt.current = null;
        uploadedProof.current = null;
        setOrderPending(false);
        saveCheckoutAttempt(null);
      }

      const nextErrors: Record<string, string> = {};

      // Only validate delivery information if the form is visible
      if (SHOW_DELIVERY_INFORMATION) {
        if (!customerForm.fullName?.trim()) nextErrors.fullName = "Name is required";
        if (!customerForm.phone?.trim()) nextErrors.phone = "Phone is required";
        if (!customerForm.address?.trim()) nextErrors.address = "Address is required";
        if (!customerForm.city?.trim()) nextErrors.city = "City is required";
      }

      if (!selectedPayment) nextErrors.payment = "Please select a payment method";
      if ((!cartItems || cartItems.length === 0) && !orderAttempt.current) nextErrors.cart = "Your bag is empty";
      if (!orderAttempt.current && selectedPayment !== "cod" && !paymentScreenshots[selectedPayment ?? ""]) {
        nextErrors.screenshot = "Please upload your payment screenshot";
      }

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
          payment_account_name: KBZPAY_ACCOUNT_NAME,
          payment_phone: KBZPAY_PHONE,
          payment_account_number: null,
        },
        wavepay: {
          payment_method: "wavepay",
          payment_status: "Verifying",
          payment_account_name: WAVEPAY_ACCOUNT_NAME,
          payment_phone: WAVEPAY_PHONE,
          payment_account_number: null,
        },
        ayapay: {
          payment_method: "ayapay",
          payment_status: "Verifying",
          payment_account_name: AYAPAY_ACCOUNT_NAME,
          payment_phone: AYAPAY_PHONE,
          payment_account_number: null,
        },
        bank: {
          payment_method: "bank",
          payment_status: "Verifying",
          payment_account_name: settings.bank_account_name || "GOSH PERFUME",
          payment_phone: null,
          payment_account_number: settings.bank_account_number || null,
        },
      } as const;

      const selectedPaymentInfo = paymentInfo[selectedPayment as keyof typeof paymentInfo];

      if (!selectedPaymentInfo) {
        setSubmitError("Invalid payment method.");
        setSubmittingOrder(false);
        return;
      }

      const isRetry = orderAttempt.current !== null;
      if (!orderAttempt.current) {
        const paymentUploadResult = await uploadPaymentProof(authorizationHeader);
        const orderItemsPayload = cartItems.map((item) => ({
          product_id: String(item.id),
          selected_size: item.selectedSize || null,
          quantity: Number(item.qty || 1),
        }));
        // Keep this exact body AND key after a lost/ambiguous response. Reuploading
        // the proof would change the server's idempotency fingerprint.
        orderAttempt.current = { userId, key: crypto.randomUUID(), body: JSON.stringify({
          customerName: SHOW_DELIVERY_INFORMATION ? customerForm.fullName : "Guest Customer",
          phone: SHOW_DELIVERY_INFORMATION ? customerForm.phone : "N/A",
          address: SHOW_DELIVERY_INFORMATION ? customerForm.address : "N/A",
          city: SHOW_DELIVERY_INFORMATION ? customerForm.city : "N/A",
          paymentMethod: selectedPaymentInfo.payment_method,
          paymentAccountName: selectedPaymentInfo.payment_account_name,
          paymentPhone: selectedPaymentInfo.payment_phone,
          paymentAccountNumber: selectedPaymentInfo.payment_account_number,
          paymentScreenshotUrl: null,
          paymentScreenshotFileId: paymentUploadResult?.fileId ?? null,
          items: orderItemsPayload,
        }) };
        saveCheckoutAttempt(orderAttempt.current);
      }
      const attempt = orderAttempt.current;
      setOrderPending(true);
      const submittedBody = JSON.parse(attempt.body) as {
        items?: Array<{ product_id: string; quantity: number }>;
        paymentScreenshotFileId?: string | null;
      };
      devLog.info("Checkout order submission", {
        retried: isRetry, idempotencyReused: isRetry,
        items: submittedBody.items?.map(item => ({ productId: item.product_id, requestedQuantity: item.quantity })),
        proofReady: Boolean(submittedBody.paymentScreenshotFileId),
      });
      const orderResponse = await fetch("/api/checkout/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.key,
          ...authorizationHeader,
        },
        body: attempt.body,
      });
      const orderResult = (await orderResponse.json()) as { data?: unknown; error?: string };
      const savedOrderData = orderResult.data;
      const orderError = orderResult.error ? { message: orderResult.error } : null;

      const savedOrder = Array.isArray(savedOrderData) ? savedOrderData[0] : savedOrderData;

      if (!orderResponse.ok || orderError || !savedOrder) {
        const orderMessage = getOrderErrorMessage(orderError);

        // A structured client rejection cannot have committed this order.
        // An ambiguous response (network/5xx/timeout) must retry the same attempt.
        if (orderError && [400, 404, 409, 413, 415, 422].includes(orderResponse.status)) {
          orderAttempt.current = null;
          setOrderPending(false);
          saveCheckoutAttempt(null);
        }

        // Log error for debugging and show user-friendly message
        devLog.error("Order creation failed:", orderError);
        setSubmitError(orderMessage);
        setSubmittingOrder(false);
        return;
      }

      const order = savedOrder as PlacedOrder;
      orderCompleted.current = true;

      // The Firestore place-order route returns order_items directly.
      const trustedOrderItems = (order as unknown as { order_items?: SavedOrderItem[] }).order_items || [];
      const savedOrderItems = trustedOrderItems.map((item) => ({
        ...item,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      }));

      void getFirebaseAuthorizationHeader().then((headers) => {
        return fetch("/api/email/order-created", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({ orderId: order.id }),
        });
      }).catch(() => {
        devLog.error("Order email notification failed.");
      });

      // NOTE: Admin notifications are created by the server-side order flow
      // This prevents duplicate notifications from frontend + backend sources

      // Save to localStorage as backup
      try {
        const backup = JSON.parse(localStorage.getItem("gosh_orders") || "[]");
        const localOrders = Array.isArray(backup) ? backup : [];
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
      } catch {
        // The server order is already committed; browser storage is only a backup.
        devLog.warn("Order saved; browser order backup is unavailable.");
      }

      setShowPaymentModal(false);
      setSuccessOrder({
        order_number: order.order_number,
        phone: order.phone,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_items: savedOrderItems,
      });
      setShowSuccessModal(true);
      clearCart();
      orderAttempt.current = null;
      uploadedProof.current = null;
      setOrderPending(false);
      saveCheckoutAttempt(null);

    } catch {
      devLog.error("Checkout request failed", { pendingOrder: orderAttempt.current !== null });
      setSubmitError(orderAttempt.current
        ? "Could not confirm your order. Please retry to check the same order."
        : "Could not upload payment proof or place order. Please try again.");
      setSubmittingOrder(false);
    } finally {
      submitInFlight.current = false;
      setSubmittingOrder(false);
    }
  };

  const updateCartItemQuantity = (id: string | number, selectedSize: string | undefined, newQuantity: number) => {
    if (submitInFlight.current || orderAttempt.current) return;
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
      devLog.error("Copy failed:", error);
    }
  };

  const handlePaymentScreenshotUpload = (paymentId: string, file: File | null) => {
    if (submitInFlight.current || orderAttempt.current) return;
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
    <main role="main" className="studio-page studio-checkout min-h-screen bg-[var(--site-bg)] text-ink">
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
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
                SAFE • SECURE • CONVENIENT
              </p>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent" />
            </div>

            {/* Main Heading */}
            <h1 className="studio-gradient mb-6 text-3xl font-semibold sm:text-5xl lg:text-7xl">
              <span className="bg-gradient-to-r from-accent via-accent to-accent bg-clip-text text-transparent">
                CHECKOUT
              </span>
            </h1>

            {/* Divider with accent */}
            <div className="mx-auto mb-6 flex items-center justify-center gap-3">
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-faint to-faint" />
              <div className="h-2 w-2 rotate-45 bg-brand" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent via-faint to-faint" />
            </div>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-base text-secondary leading-relaxed sm:text-lg">
              Complete your order with secure payment
            </p>
          </div>

          {/* Customer Information Form */}
          {SHOW_DELIVERY_INFORMATION && (
            <div className="mb-16">
              <h2 className="mb-6 text-2xl font-bold text-ink">Delivery Information</h2>
              <div className="mx-auto max-w-3xl rounded-xl border-2 border-line bg-surface p-8 shadow-soft">
                {deliveryNote && (
                  <p className="mb-6 rounded-xl border border-line bg-accent-soft/80 px-4 py-3 text-sm font-semibold text-secondary">
                    {deliveryNote}
                  </p>
                )}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="customer-fullname" className="mb-2 block text-sm font-bold text-ink">
                      Full Name *
                    </label>
                    <input
                      id="customer-fullname"
                      name="fullName"
                      type="text"
                      value={customerForm.fullName}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                      placeholder="John Doe"
                    />
                    {errors.fullName && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="customer-phone" className="mb-2 block text-sm font-bold text-ink">
                      Phone Number *
                    </label>
                    <input
                      id="customer-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                      placeholder="09123456789"
                    />
                    {errors.phone && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="customer-email" className="mb-2 block text-sm font-bold text-ink">
                      Email (Optional)
                    </label>
                    <input
                      id="customer-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="customer-address" className="mb-2 block text-sm font-bold text-ink">
                      Address *
                    </label>
                    <input
                      id="customer-address"
                      name="address"
                      type="text"
                      autoComplete="street-address"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                      placeholder="Street address, building, floor"
                    />
                    {errors.address && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-destructive">{errors.address}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="customer-city" className="mb-2 block text-sm font-bold text-ink">
                      City *
                    </label>
                    <input
                      id="customer-city"
                      name="city"
                      type="text"
                      value={customerForm.city}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                      placeholder="Yangon"
                    />
                    {errors.city && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-destructive">{errors.city}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="mx-auto mb-16 w-full max-w-6xl">
            <h2 className="mb-8 text-2xl font-bold text-ink">Select Payment Method</h2>
            {errors.payment && (
              <p role="alert" className="mb-4 text-sm font-semibold text-destructive">{errors.payment}</p>
            )}

            {/* Premium Payment Cards - Dynamic responsive grid */}
            {availablePaymentMethods.length === 0 ? (
              <div className="rounded-xl border border-line bg-accent-soft p-8 text-center shadow-soft">
                <h3 className="text-xl font-semibold text-ink">No payment methods available</h3>
                <p className="mt-2 text-sm font-medium text-secondary">
                  Please contact the store or try again later.
                </p>
              </div>
            ) : (
              <div className={paymentGridClass}>
                {availablePaymentMethods.map((method, index) => {
                const isSelected = selectedPayment === method.id;
                return <motion.button key={method.id} type="button" aria-pressed={isSelected}
                  disabled={checkoutLocked && !isSelected}
                  onClick={() => { if (!submitInFlight.current && !orderAttempt.current) setSelectedPayment(method.id); setShowPaymentModal(true); }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: .18, delay: index * .025 }} whileHover={{ y: -2 }}
                  className={"studio-payment-choice " + (isSelected ? "is-selected" : "")}>
                  <span className="studio-payment-icon"><PaymentIcon src={method.icon} alt={method.name} type={method.id as "cod" | "kbzpay" | "wavepay" | "ayapay" | "bank"} /></span>
                  <span className="text-sm font-medium text-ink">{method.name}</span>
                  <span className="text-xs text-muted">{method.description}</span>
                  {isSelected && <Check className="absolute right-3 top-3 h-4 w-4 text-brand" aria-hidden="true" />}
                </motion.button>;
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
            <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-5 text-center">
              {/* Shield icon */}
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>

              {/* Text */}
              <h4 className="mb-2 text-sm font-medium text-ink">
                Your payments are protected
              </h4>

              {/* Decorative divider */}
              <div className="mx-auto mb-3 flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent" />
                <div className="h-1.5 w-1.5 rotate-45 bg-brand" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent" />
              </div>

              {/* Subtext */}
              <p className="text-sm font-medium text-secondary">
                <span className="text-accent">Encrypted</span> • <span className="text-accent">Trusted</span> • <span className="text-accent">Secure</span>
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
              className="fixed inset-0 z-[10000] bg-overlay "
            />
            <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6">
              <StudioModal label="Order confirmation" onDismiss={() => setShowSuccessModal(false)} lockScroll={false}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-panel"
              >
                <div className="p-8 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-success to-success shadow-soft shadow-soft">
                    <CheckCircle className="h-10 w-10 text-on-brand" />
                  </div>
                  <h2 className="mb-3 text-2xl font-semibold text-ink">Order Placed Successfully!</h2>

                  {successOrder.payment_status === "Verifying" ? (
                    <>
                      <p className="mb-2 text-sm font-semibold text-accent">
                        Your payment proof has been submitted.
                      </p>
                      <p className="mb-6 text-sm text-secondary">
                        Your order is waiting for admin verification. We&apos;ll contact you at <span className="font-semibold text-ink">{successOrder.phone}</span> once payment is confirmed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-secondary">
                        Your order has been received and is being processed.
                      </p>
                      <p className="mb-6 text-sm text-secondary">
                        We&apos;ll contact you at <span className="font-semibold text-ink">{successOrder.phone}</span> to confirm delivery.
                      </p>
                    </>
                  )}

                  <div className="mb-6 rounded-xl border border-line bg-surface p-4 text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Order Number</p>
                    <p className="mt-1 text-lg font-semibold text-accent">{successOrder.order_number}</p>
                  </div>

                  {successOrder.payment_status === "Verifying" && (
                    <div className="mb-6 rounded-xl border border-line bg-accent-soft p-4">
                      <p className="text-xs font-bold text-accent">
                        ⏳ Payment Verification Pending
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-accent">
                        Our admin team will verify your payment proof and check the transaction in our account. Once verified, your order will proceed to delivery.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push("/products");
                    }}
                    className="w-full rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-brand shadow-panel transition hover:bg-brand"
                  >
                    Continue Shopping
                  </button>
                </div>
              </StudioModal>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && paymentDetails[selectedPayment] && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay px-4 py-5 "
          onClick={() => setShowPaymentModal(false)}
        >
          <StudioModal label="Payment details" onDismiss={() => setShowPaymentModal(false)} lockScroll={false}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[10000] mx-auto flex max-h-[82vh] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel"
          >
            {/* Header */}
            <div className={`relative z-[10001] shrink-0 border-b border-line bg-surface/95  ${selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay" ? "px-5 py-4 sm:px-6 sm:py-4" : "px-6 py-5"}`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPaymentModal(false);
                }}
                className={`absolute z-[10002] flex items-center justify-center rounded-full bg-brand font-bold text-on-brand shadow-panel transition hover:scale-105 hover:bg-brand ${selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay" ? "right-3 top-3 h-7 w-7 text-base sm:right-4 sm:top-4 sm:h-8 sm:w-8 sm:text-lg" : "right-4 top-4 h-8 w-8 text-lg"}`}
                aria-label="Close payment details"
              >
                ×
              </button>
              <p className={`font-semibold uppercase text-accent ${selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay" ? "text-[11px] tracking-[0.22em] sm:text-xs sm:tracking-[0.28em]" : "text-xs tracking-[0.28em]"}`}>Secure Payment</p>
              <h2 className={`pr-12 font-bold leading-tight text-ink ${
                selectedPayment === "kbzpay"
                  ? "mt-1 text-[1.45rem] sm:mt-1.5 sm:text-[1.75rem]"
                  : selectedPayment === "wavepay"
                    ? "mt-1 text-[1.25rem] sm:mt-1.5 sm:text-[1.55rem]"
                    : selectedPayment === "ayapay"
                      ? "mt-1 text-[1.25rem] sm:mt-1.5 sm:text-[1.55rem]"
                    : "mt-2 text-2xl sm:text-3xl"
              }`}>
                {paymentDetails[selectedPayment].title}
              </h2>
              <div className={`pointer-events-none h-px bg-gradient-to-r from-accent to-transparent ${selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay" ? "mt-2.5 w-14 sm:mt-3 sm:w-16" : "mt-4 w-20"}`} />
            </div>

            {/* Body */}
            <div className="scrollbar-auto-hide min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 overscroll-contain sm:px-6 sm:py-5">
              {/* Cash on Delivery */}
              {selectedPayment === "cod" && (
                <>
                  <div className="rounded-xl border border-line bg-surface/80 p-5 shadow-panel text-center">
                    <p className="text-base font-semibold text-ink leading-relaxed">
                      {paymentDetails[selectedPayment].message}
                    </p>
                  </div>
                  <div className="mt-4 rounded-xl bg-accent-soft/60 p-4">
                    <p className="text-sm leading-6 text-secondary text-center">
                      Our delivery team will collect payment upon delivery of your perfume.
                    </p>
                  </div>
                </>
              )}

              {/* Mobile Payment Methods (KBZPay, WavePay, AYA Pay) */}
              {(selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay") && (
                <>
                  {(selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay") && paymentDetails[selectedPayment].qrImage && (
                    <div className="mb-4 flex justify-center">
                      <div className="w-full max-w-[188px] rounded-xl border border-line bg-surface/90 p-2.5 shadow-panel sm:max-w-[250px] sm:p-3">
                        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-panel">
                          <Image
                            src={paymentDetails[selectedPayment].qrImage ?? (selectedPayment === "wavepay" ? WAVEPAY_QR_IMAGE : selectedPayment === "ayapay" ? AYAPAY_QR_IMAGE : KBZPAY_QR_IMAGE)}
                            alt={selectedPayment === "wavepay" ? "WavePay QR code" : selectedPayment === "ayapay" ? "AYA Pay QR code" : "KBZPay QR code"}
                            width={720}
                            height={720}
                            className="h-auto w-full object-contain"
                            sizes="(max-width: 640px) 188px, 250px"
                            priority
                          />
                        </div>
                        <div className="mt-2.5 rounded-xl bg-accent-soft/60 px-2.5 py-2 text-center sm:mt-3 sm:px-3 sm:py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                            {selectedPayment === "wavepay" ? "Scan With WavePay" : selectedPayment === "ayapay" ? "Scan With AYA Pay" : "Scan With KBZPay"}
                          </p>
                          <p className="mt-1 text-xs font-bold text-ink sm:mt-1.5 sm:text-sm">
                            {paymentDetails[selectedPayment].accountName}
                          </p>
                          <div className="mt-1 flex translate-x-4 items-center justify-center gap-1.5 sm:mt-1.5 sm:gap-2">
                            <span className="text-[11px] font-bold text-ink sm:text-xs">
                              {paymentDetails[selectedPayment].phone}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(paymentDetails[selectedPayment].phone ?? "", "phone")}
                              className="rounded-full border border-line bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold text-accent transition hover:bg-accent-soft sm:px-2 sm:text-[10px]"
                            >
                              {copiedField === "phone" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedPayment !== "kbzpay" && selectedPayment !== "wavepay" && selectedPayment !== "ayapay" && (
                    <div className="rounded-xl border border-line bg-surface/80 p-4 shadow-panel">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Account Name</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-ink sm:text-base">{paymentDetails[selectedPayment].accountName}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(paymentDetails[selectedPayment].accountName ?? "", "accountName")}
                              className="rounded-full border border-line bg-accent-soft px-3 py-1 text-xs font-bold text-accent transition hover:bg-accent-soft"
                            >
                              {copiedField === "accountName" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 text-center">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Phone</span>
                          <div className="flex translate-x-4 items-center justify-center gap-2">
                            <span className="text-sm font-bold text-ink sm:text-base">{paymentDetails[selectedPayment].phone}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(paymentDetails[selectedPayment].phone ?? "", "phone")}
                              className="rounded-full border border-line bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent transition hover:bg-accent-soft sm:px-2.5 sm:text-[11px]"
                            >
                              {copiedField === "phone" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={`rounded-xl bg-accent-soft/60 ${selectedPayment === "wavepay" || selectedPayment === "ayapay" ? "mt-2.5 p-2.5 sm:mt-3 sm:p-3" : "mt-3 p-3"}`}>
                    <p className="text-sm leading-5 text-secondary">
                      <span className="font-bold text-accent">Instruction: </span>
                      {paymentDetails[selectedPayment].instruction}
                    </p>
                    {paymentDetails[selectedPayment].secondaryInstruction && (
                      <p className="mt-1.5 text-sm leading-5 text-secondary">
                        {paymentDetails[selectedPayment].secondaryInstruction}
                      </p>
                    )}
                  </div>
                  {paymentDetails[selectedPayment].note && (
                    <p className="mt-4 text-center text-xs italic text-muted">{paymentDetails[selectedPayment].note}</p>
                  )}
                </>
              )}

              {/* Bank Transfer */}
              {selectedPayment === "bank" && (
                <>
                  <div className="rounded-xl border border-line bg-surface/80 p-4 shadow-panel">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Bank Name</span>
                        <span className="text-sm font-bold text-ink sm:text-base">{paymentDetails[selectedPayment].bankName}</span>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Account Name</span>
                        <span className="text-sm font-bold text-ink sm:text-base">{paymentDetails[selectedPayment].accountName}</span>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Account Number</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink sm:text-base">{paymentDetails[selectedPayment].accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentDetails[selectedPayment].accountNumber ?? "", "accountNumber")}
                            className="rounded-full border border-line bg-accent-soft px-3 py-1 text-xs font-bold text-accent transition hover:bg-accent-soft"
                          >
                            {copiedField === "accountNumber" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-accent-soft/60 p-4">
                    <p className="text-sm leading-6 text-secondary">
                      <span className="font-bold text-accent">Instruction: </span>
                      {paymentDetails[selectedPayment].instruction}
                    </p>
                  </div>
                </>
              )}

              {/* Payment Screenshot Upload */}
              {selectedPayment && ["kbzpay", "wavepay", "ayapay", "bank"].includes(selectedPayment) && (
                <div className={`rounded-xl border border-line bg-surface/80 shadow-panel ${selectedPayment === "kbzpay" || selectedPayment === "wavepay" || selectedPayment === "ayapay" ? "mt-3 p-3" : "mt-5 p-4"}`}>
                  <p className="text-sm font-bold text-ink">Upload payment screenshot</p>
                  <p className="mt-1 text-xs text-muted">Attach your transaction screenshot after payment.</p>

                  <label htmlFor={`payment-screenshot-${selectedPayment}`} className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-accent-soft/50 px-4 py-4 text-center transition hover:bg-accent-soft">
                    <span className="text-2xl text-accent">☁</span>
                    <span className="mt-1 text-sm font-bold text-accent">Choose screenshot</span>
                    <span className="mt-1 text-xs text-muted">PNG, JPG, JPEG, WEBP</span>
                    <input
                      id={`payment-screenshot-${selectedPayment}`}
                      name={`paymentScreenshot_${selectedPayment}`}
                      type="file"
                      disabled={checkoutLocked}
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        handlePaymentScreenshotUpload(selectedPayment, file);
                      }}
                    />
                  </label>

                  {paymentScreenshots[selectedPayment] && (
                    <div className="mt-4 rounded-xl border border-line bg-surface p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="truncate text-xs font-semibold text-secondary flex-1 pr-2">
                          {paymentScreenshots[selectedPayment]!.name}
                        </p>
                        <button
                          type="button"
                          disabled={checkoutLocked}
                          onClick={() => handlePaymentScreenshotUpload(selectedPayment, null)}
                          className="text-xs text-destructive hover:text-destructive font-medium whitespace-nowrap"
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

                  <p className="mt-3 rounded-xl bg-accent-soft/60 px-3 py-2 text-center text-xs italic text-muted">
                    Your screenshot is only used to verify your payment.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="relative z-[10002] shrink-0 border-t border-line bg-surface/95 px-6 py-4 ">
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
                  Boolean(selectedPayment) &&
                  (orderPending || (cartItems.length > 0 &&
                    (!requiresScreenshot || Boolean(selectedPaymentScreenshot)) &&
                    !isBelowMinimumOrder)) &&
                  settings.enable_checkout &&
                  // Delivery-information fields are only required when the
                  // delivery form is visible. When hidden (guest checkout), the
                  // submit uses "Guest Customer"/"N/A" defaults and these are
                  // intentionally not stored, so they must not gate readiness.
                  (!SHOW_DELIVERY_INFORMATION ||
                    (Boolean(normalizedCustomer.fullName) &&
                      Boolean(normalizedCustomer.phone) &&
                      Boolean(normalizedCustomer.address) &&
                      Boolean(normalizedCustomer.city)));

                const confirmDisabled = submittingOrder || !isPaymentReady;

                return (
                  <>
                    {/* Checkout disabled message */}
                    {!settings.enable_checkout && (
                      <div role="alert" className="mb-3 rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-bold text-destructive">
                        Checkout is currently unavailable.
                      </div>
                    )}

                    {/* Minimum order amount message */}
                    {isBelowMinimumOrder && (
                      <div role="alert" className="mb-3 rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm font-bold text-accent">
                        Minimum order amount is {minimumOrderAmount.toLocaleString()} MMK.
                      </div>
                    )}

                    {/* No payment methods available */}
                    {availablePaymentMethods.length === 0 && (
                      <div role="alert" className="mb-3 rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-bold text-destructive">
                        No payment methods are currently available.
                      </div>
                    )}

                    {/* Error message */}
                    {submitError && (
                      <div role="alert" className="mb-3 rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-bold text-destructive">
                        <StudioErrorText message={submitError} />
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
                      className={`relative z-[10003] w-full rounded-full px-5 py-3 text-sm font-semibold shadow-panel transition pointer-events-auto ${
                        confirmDisabled
                          ? "cursor-not-allowed bg-surface-muted text-muted shadow-none"
                          : "bg-brand text-on-brand hover:bg-brand"
                      }`}
                    >
                      {showSubmitLoading
                        ? "Placing Order..."
                        : selectedPayment === "cod"
                        ? "Confirm Cash on Delivery"
                        : "Confirm Payment & Place Order"}
                    </button>
                  </>
                );
              })()}
            </div>
          </StudioModal>
        </div>
      )}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <PageErrorBoundary context="checkout">
      <CheckoutPageContent />
    </PageErrorBoundary>
  );
}
