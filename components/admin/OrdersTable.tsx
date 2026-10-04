"use client";
import StudioModal from "@/components/ui/StudioModal";
import devLog from "@/lib/dev-log";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ChevronLeft, ChevronRight, Clock, ExternalLink, Package, Search, XCircle } from "lucide-react";
import { getFirebaseAuthorizationHeader } from "@/lib/firebase/client-auth";
import { db } from "@/lib/firebase/config";
import { useAdminAuth } from "./AdminAuthProvider";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import PremiumStatusSelect from "@/components/admin/PremiumStatusSelect";
import { ComponentErrorBoundary } from "../ErrorBoundaries";

interface OrderItem {
  id: string;
  product_name: string;
  product_brand: string | null;
  product_image: string | null;
  selected_size: string | null;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  phone: string;
  address: string;
  city: string | null;
  payment_method: string;
  payment_status: string;
  payment_account_name: string | null;
  payment_phone: string | null;
  payment_account_number: string | null;
  payment_screenshot_url: string | null;
  payment_screenshot_file_id: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: "Pending" | "Confirmed" | "Processing" | "Delivered" | "Cancelled";
  created_at: string;
  order_items?: OrderItem[];
}

const statusFilters = ["All", "Pending", "Confirmed", "Processing", "Delivered", "Cancelled"] as const;
const paymentFilters = ["All", "Unpaid", "Paid", "Verifying", "Failed", "Refunded"] as const;
const ORDERS_PER_PAGE = 10;
const prepaidPaymentMethods = new Set(["kbzpay", "wavepay", "ayapay", "bank"]);
const paymentStatusGuidance: Record<string, string> = {
  Unpaid: "Cash still pending or payment has not been received.",
  Verifying: "Payment proof uploaded. Check amount, account, date, and transaction details before marking Paid.",
  Paid: "Payment confirmed. Order can move forward for fulfillment.",
  Failed: "Payment proof is invalid, amount is wrong, duplicate, or transfer failed.",
  Refunded: "Customer payment has been returned or refund was completed.",
};

function OrdersTableContent() {
  const searchParams = useSearchParams();
  const orderIdFromNotification = searchParams.get("orderId");
  const statusFromUrl = searchParams.get("status");
  const paymentFromUrl = searchParams.get("payment");

  /*
   * Firestore admin queries require an authenticated admin token. The browser
   * Firebase client auth is restored asynchronously after a full page load,
   * so wait until it is restored + verified before querying.
   */
  const { isAdmin, loading: authLoading } = useAdminAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [paymentFilter, setPaymentFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [paymentScreenshotError, setPaymentScreenshotError] = useState(false);
  const [, setExpandedOrderId] = useState<string | null>(null);
  const [openedNotificationOrderId, setOpenedNotificationOrderId] = useState<string | null>(null);
  const [notificationOrderNotFound, setNotificationOrderNotFound] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalOrders / ORDERS_PER_PAGE));
  const pageStart = totalOrders === 0 ? 0 : (currentPage - 1) * ORDERS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ORDERS_PER_PAGE, totalOrders);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      const ordersQuery = query(
        collection(db, "orders"),
        orderBy("created_at", "desc")
      );

      const ordersSnap = await getDocs(ordersQuery);

      const allOrders: Order[] = await Promise.all(
        ordersSnap.docs.map(async (doc) => {
          const data = doc.data() as Record<string, unknown>;

          const itemsSnap = await getDocs(
            collection(db, "orders", doc.id, "items")
          );

          const orderItems: OrderItem[] = itemsSnap.docs.map((itemDoc) => {
            const itemData = itemDoc.data() as Record<string, unknown>;
            return {
              id: itemDoc.id,
              product_name: (itemData.product_name as string) || "",
              product_brand: (itemData.product_brand as string) || null,
              product_image: (itemData.product_image as string) || null,
              selected_size: (itemData.selected_size as string) || null,
              price: Number(itemData.price ?? 0) || 0,
              quantity: Number(itemData.quantity ?? 0) || 1,
            };
          });

          const toIso = (val: unknown): string => {
            if (!val) return "";
            if (val instanceof Date) return val.toISOString();
            if (typeof val === "string") return val;
            if (
              typeof val === "object" &&
              "toDate" in val &&
              typeof (val as { toDate: () => Date }).toDate === "function"
            ) {
              return (val as { toDate: () => Date }).toDate().toISOString();
            }
            return "";
          };

          return {
            id: doc.id,
            order_number: (data.order_number as string) || "",
            user_id: (data.user_id as string) || null,
            customer_name: (data.customer_name as string) || "",
            customer_email: (data.customer_email as string) || null,
            phone: (data.phone as string) || "",
            address: (data.address as string) || "",
            city: (data.city as string) || null,
            payment_method: (data.payment_method as string) || "",
            payment_status: (data.payment_status as string) || "",
            payment_account_name: (data.payment_account_name as string) || null,
            payment_phone: (data.payment_phone as string) || null,
            payment_account_number: (data.payment_account_number as string) || null,
            payment_screenshot_url: (data.payment_screenshot_url as string) || null,
            payment_screenshot_file_id: (data.payment_screenshot_file_id as string) || null,
            subtotal: Number(data.subtotal ?? 0) || 0,
            delivery_fee: Number(data.delivery_fee ?? 0) || 0,
            discount: Number(data.discount ?? 0) || 0,
            total: Number(data.total ?? 0) || 0,
            status: (data.status as Order["status"]) || "Pending",
            created_at: toIso(data.created_at),
            order_items: orderItems,
          };
        })
      );

      // Client-side filter/search/sort
      let filtered = [...allOrders];

      if (filter !== "All") {
        filtered = filtered.filter((o) => o.status === filter);
      }

      if (paymentFilter !== "All") {
        filtered = filtered.filter((o) => o.payment_status === paymentFilter);
      }

      const search = searchQuery.trim().toLowerCase();
      if (search) {
        filtered = filtered.filter(
          (o) =>
            o.order_number.toLowerCase().includes(search) ||
            o.customer_name.toLowerCase().includes(search) ||
            (o.customer_email || "").toLowerCase().includes(search) ||
            o.phone.toLowerCase().includes(search)
        );
      }

      const total = filtered.length;
      const from = (currentPage - 1) * ORDERS_PER_PAGE;
      const paged = filtered.slice(from, from + ORDERS_PER_PAGE);

      setOrders(paged);
      setTotalOrders(total);
    } catch (error) {
      devLog.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, paymentFilter, searchQuery]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    loadOrders();
  }, [loadOrders, authLoading, isAdmin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, paymentFilter, searchQuery]);

  useEffect(() => {
    if (statusFromUrl && statusFilters.includes(statusFromUrl as typeof statusFilters[number])) {
      setFilter(statusFromUrl);
    }

    if (paymentFromUrl && paymentFilters.includes(paymentFromUrl as typeof paymentFilters[number])) {
      setPaymentFilter(paymentFromUrl);
    }
  }, [paymentFromUrl, statusFromUrl]);

  // Auto-expand order from notification
  useEffect(() => {
    if (!orderIdFromNotification || orders.length === 0) return;
    if (openedNotificationOrderId === orderIdFromNotification) return;

    const matchedOrder = orders.find((order) => order.id === orderIdFromNotification);
    
    if (matchedOrder) {
      setExpandedOrderId(matchedOrder.id);
      setOpenedNotificationOrderId(orderIdFromNotification);
      setNotificationOrderNotFound(false);
      
      // Scroll to the order after a brief delay
      setTimeout(() => {
        const orderElement = document.getElementById(`order-${matchedOrder.id}`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    } else {
      setNotificationOrderNotFound(true);
      setOpenedNotificationOrderId(orderIdFromNotification);
    }
  }, [orderIdFromNotification, orders, openedNotificationOrderId]);

  const getPaymentScreenshotUrl = async (orderId: string) => {
    if (!orderId) return null;

    try {
      // Fetch the receipt through the authenticated, authorized proxy route so
      // the raw ImageKit URL is never exposed to the browser. The admin's
      // Firebase ID token authenticates the request.
      const headers = await getFirebaseAuthorizationHeader();

      const response = await fetch(
        `/api/checkout/payment-proof?orderId=${encodeURIComponent(orderId)}`,
        { headers }
      );

      if (!response.ok) return null;

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      devLog.error("Failed to load payment proof:", error);
      return null;
    }
  };

  const callOrderStatusAction = async (body: Record<string, unknown>) => {
    const headers = await getFirebaseAuthorizationHeader();

    const response = await fetch("/api/admin/orders/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { data?: unknown; error?: string };

    if (!response.ok || result.error) {
      throw new Error(result.error || "Order status action failed.");
    }

    return result.data;
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    const previousOrder = orders.find((order) => order.id === orderId);
    const previousStatus = previousOrder?.status;

    setUpdatingOrders(prev => new Set(prev).add(orderId));
    try {
      const updatedOrderData = await callOrderStatusAction({
        type: "order",
        orderId,
        status: newStatus,
      });

      const updatedOrder = Array.isArray(updatedOrderData) ? updatedOrderData[0] : updatedOrderData;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, ...(updatedOrder || {}), status: newStatus } : order
      ));
      setActionMessage({ type: "success", text: "Order status updated." });

      if (previousStatus && previousStatus !== newStatus) {
        void getFirebaseAuthorizationHeader().then((authHeaders) => {
          return fetch("/api/admin/email/order-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify({
              orderId,
              previousStatus,
              nextStatus: newStatus,
            }),
          }).catch((emailError) => {
            devLog.error("Order status email failed:", emailError);
          });
        });
      }
    } catch (error) {
      devLog.error("Error updating order status:", error);
      setActionMessage({ type: "error", text: "Failed to update order status." });
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    const previousOrder = orders.find((order) => order.id === orderId);

    if (
      previousOrder &&
      newPaymentStatus === "Paid" &&
      prepaidPaymentMethods.has(previousOrder.payment_method) &&
      !previousOrder.payment_screenshot_file_id &&
      !previousOrder.payment_screenshot_url
    ) {
      setActionMessage({
        type: "error",
        text: "Payment proof is missing. Upload or confirm proof before marking this prepaid order as Paid.",
      });
      return;
    }

    setUpdatingOrders(prev => new Set(prev).add(orderId));
    try {
      const updatedOrderData = await callOrderStatusAction({
        type: "payment",
        orderId,
        paymentStatus: newPaymentStatus,
      });

      const updatedOrder = Array.isArray(updatedOrderData) ? updatedOrderData[0] : updatedOrderData;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, ...(updatedOrder || {}), payment_status: newPaymentStatus } : order
      ));
      setActionMessage({ type: "success", text: "Payment status updated." });
    } catch (error) {
      devLog.error("Error updating payment status:", error);
      setActionMessage({ type: "error", text: "Failed to update payment status." });
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cod: "Cash on Delivery",
      kbzpay: "KBZPay",
      wavepay: "WavePay",
      ayapay: "AYA Pay",
      bank: "Bank Transfer",
    };
    return labels[method] || method;
  };

  const getPaymentMethodBadgeColor = (method: string) => {
    if (method === "cod") {
      return "bg-surface-muted text-secondary border-line   ";
    }
    return "bg-accent-soft text-accent border-line   ";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Confirmed":
        return <Package className="h-4 w-4" />;
      case "Processing":
        return <Package className="h-4 w-4" />;
      case "Delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "Cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-accent-soft text-accent border-line   ";
      case "Confirmed":
        return "bg-info-soft text-info border-info   ";
      case "Processing":
        return "bg-info-soft text-info border-info   ";
      case "Delivered":
        return "bg-success-soft text-success border-success   ";
      case "Cancelled":
        return "bg-destructive-soft text-destructive border-destructive   ";
      default:
        return "bg-surface-muted text-secondary border-line   ";
    }
  };

  if (loading && orders.length === 0 && totalOrders === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-line border-t-transparent" />
        <p className="mt-4 text-sm text-secondary">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${
            actionMessage.type === "success"
              ? "border-success bg-success-soft text-success"
              : "border-destructive bg-destructive-soft text-destructive"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="rounded-full px-2 py-1 text-xs font-semibold opacity-70 transition hover:bg-surface/70 hover:opacity-100"
          >
            Close
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            id="admin-order-search"
            name="admin_order_search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search order number, customer, email, or phone..."
            className="w-full rounded-xl border border-line bg-surface py-3 pl-12 pr-4 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:border-focus focus:ring-4 focus:ring-focus/15"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                filter === status
                  ? "bg-brand text-on-brand shadow-soft"
                  : "border border-line bg-surface text-secondary hover:border-line hover:bg-accent-soft"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {paymentFilters.map((status) => (
            <button
              key={status}
              onClick={() => setPaymentFilter(status)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                paymentFilter === status
                  ? "bg-brand text-on-brand shadow-soft"
                  : "border border-line bg-surface text-secondary hover:border-line hover:bg-accent-soft"
              }`}
            >
              {status === "All" ? "All Payments" : status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4   sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(paymentStatusGuidance).map(([status, description]) => (
          <div key={status} className="rounded-xl border border-line bg-surface p-3  ">
            <p className="text-sm font-semibold text-ink ">{status}</p>
            <p className="mt-1 text-xs leading-5 text-secondary ">{description}</p>
          </div>
        ))}
      </div>

      {/* Notification Order Not Found Message */}
      {notificationOrderNotFound && (
        <div className="rounded-xl border border-line bg-accent-soft p-4">
          <p className="text-sm font-bold text-accent">
            Related order could not be found.
          </p>
          <p className="mt-1 text-xs text-accent">
            The order may have been deleted or the notification link is invalid.
          </p>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col items-start justify-between gap-3 text-sm text-secondary sm:flex-row sm:items-center">
          <p>
            Showing <span className="font-bold text-ink">{pageStart}</span>-<span className="font-bold text-ink">{pageEnd}</span> of{" "}
            <span className="font-bold text-ink">{totalOrders}</span> orders
          </p>
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 text-sm font-bold text-ink transition hover:border-line hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="rounded-full bg-accent-soft px-3 py-2 text-center text-sm font-semibold text-accent sm:px-4">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 text-sm font-bold text-ink transition hover:border-line hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="rounded-xl border border-line bg-surface p-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-line border-t-transparent" />
          <p className="mt-4 text-sm text-secondary">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-faint" />
          <h3 className="mt-4 text-lg font-bold text-ink">No orders found</h3>
          <p className="mt-2 text-sm text-secondary">Orders will appear here once customers place them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isHighlighted = order.id === orderIdFromNotification;
            
            return (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className={`rounded-xl border bg-surface shadow-soft transition-all duration-300 hover:shadow-soft   ${
                  isHighlighted
                    ? "ring-2 ring-line border-line bg-accent-soft/50  "
                    : "border-line hover:border-line  "
                }`}
              >
              <div className="p-4 sm:p-6">
                {/* Order Header */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-ink ">{order.order_number}</h3>
                    <p className="text-sm text-secondary ">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-semibold text-accent">${order.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted ">Customer</p>
                    <p className="mt-1 font-semibold text-ink ">{order.customer_name}</p>
                    <p className="text-sm text-secondary ">{order.phone}</p>
                    {order.customer_email && (
                      <p className="break-all text-sm text-secondary ">{order.customer_email}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted ">Address</p>
                    <p className="mt-1 text-sm text-secondary ">{order.address}</p>
                    {order.city && <p className="text-sm text-secondary ">{order.city}</p>}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted ">Payment Information</p>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-secondary ">Method:</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentMethodBadgeColor(order.payment_method)}`}>
                        {getPaymentMethodLabel(order.payment_method)}
                      </span>
                    </div>
                    
                    {/* Payment Account Details */}
                    {order.payment_account_name && (
                      <p className="text-sm text-secondary ">
                        <span className="font-semibold">Account:</span> {order.payment_account_name}
                      </p>
                    )}
                    {order.payment_phone && (
                      <p className="text-sm text-secondary ">
                        <span className="font-semibold">Phone:</span> {order.payment_phone}
                      </p>
                    )}
                    {order.payment_account_number && (
                      <p className="text-sm text-secondary ">
                        <span className="font-semibold">Account Number:</span> {order.payment_account_number}
                      </p>
                    )}
                    
                    {/* Payment Screenshot */}
                    {(order.payment_screenshot_file_id || order.payment_screenshot_url) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setPaymentScreenshotError(false);
                          const url = await getPaymentScreenshotUrl(order.id);
                          if (!url) {
                            setPaymentScreenshotError(true);
                            setPaymentScreenshotUrl("error");
                            return;
                          }
                          setPaymentScreenshotUrl(url);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-accent shadow-soft transition hover:bg-accent-soft    "
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Payment Screenshot
                      </button>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-muted">
                        No Screenshot
                      </span>
                    )}

                    {prepaidPaymentMethods.has(order.payment_method) && !order.payment_screenshot_file_id && !order.payment_screenshot_url && order.payment_status !== "Paid" && (
                      <div role="alert" className="rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-bold text-destructive   ">
                        Prepaid order has no payment proof. Keep as Verifying/Failed until proof is confirmed.
                      </div>
                    )}

                    <div className="rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm text-accent   ">
                      <span className="font-semibold">{order.payment_status || "Unpaid"}:</span>{" "}
                      {paymentStatusGuidance[order.payment_status || "Unpaid"] || "Review this payment before fulfillment."}
                    </div>
                    
                    {/* Payment Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-secondary ">Status:</span>
                      <PremiumStatusSelect
                        type="payment"
                        value={order.payment_status || "Unpaid"}
                        onChange={(value) => updatePaymentStatus(order.id, value)}
                        disabled={updatingOrders.has(order.id)}
                      />
                    </div>

                    {/* Quick Payment Action Buttons */}
                    {order.payment_status === "Verifying" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updatePaymentStatus(order.id, "Paid")}
                          disabled={updatingOrders.has(order.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-success bg-success-soft px-4 py-2 text-sm font-bold text-success shadow-soft transition hover:bg-success-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark as Paid
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePaymentStatus(order.id, "Failed")}
                          disabled={updatingOrders.has(order.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-destructive bg-destructive-soft px-4 py-2 text-sm font-bold text-destructive shadow-soft transition hover:bg-destructive-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePaymentStatus(order.id, "Unpaid")}
                          disabled={updatingOrders.has(order.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-secondary shadow-soft transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50    "
                        >
                          <Clock className="h-4 w-4" />
                          Mark as Unpaid
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted ">Items</p>
                  <div className="space-y-2">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item, index) => (
                        <div key={index} className="flex flex-col gap-3 rounded-xl border border-transparent bg-surface-muted p-3   sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink ">{item.product_name}</p>
                            <p className="text-xs text-secondary ">
                              {item.product_brand && `${item.product_brand} • `}
                              {item.selected_size && `${item.selected_size} • `}
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-semibold text-ink ">${item.price.toFixed(2)}</p>
                            <p className="text-xs text-secondary ">
                              Total: ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted ">No items found</p>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="mb-4 rounded-xl border border-transparent bg-surface-muted p-3  ">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary ">Subtotal:</span>
                      <span className="font-semibold text-ink ">${order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-secondary ">Delivery Fee:</span>
                        <span className="font-semibold text-ink ">${order.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Discount:</span>
                        <span className="font-semibold text-success">-${order.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-line pt-1 ">
                      <span className="font-bold text-ink ">Total:</span>
                      <span className="font-bold text-accent">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Status Dropdown */}
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Order Status:</p>
                  <PremiumStatusSelect
                    type="order"
                    value={order.status || "Pending"}
                    onChange={(value) => updateOrderStatus(order.id, value as Order["status"])}
                    disabled={updatingOrders.has(order.id)}
                  />
                  <span className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Payment Screenshot Modal */}
      {paymentScreenshotUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay p-3  sm:p-6"
          onClick={() => {
            setPaymentScreenshotUrl(null);
            setPaymentScreenshotError(false);
          }}
        >
          <StudioModal label="Payment proof" onDismiss={() => { setPaymentScreenshotUrl(null); setPaymentScreenshotError(false); }} lockScroll={true}
            className="relative inline-flex max-h-[92vh] w-auto max-w-[94vw] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel  "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3   sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent sm:text-xs">Payment Proof</p>
                <h3 className="truncate text-base font-semibold text-ink  sm:text-lg">Payment Screenshot</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentScreenshotUrl(null);
                  setPaymentScreenshotError(false);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-on-brand shadow-panel transition hover:bg-brand sm:h-10 sm:w-10"
                aria-label="Close payment screenshot"
              >
                ×
              </button>
            </div>
            {/* Screenshot preview */}
            <div className="flex items-center justify-center overflow-auto bg-surface-muted p-2 sm:p-3">
              {!paymentScreenshotError && paymentScreenshotUrl !== "error" ? (
                <img
                  src={paymentScreenshotUrl}
                  alt="Payment screenshot"
                  className="block h-auto w-auto max-h-[76vh] max-w-[90vw] rounded-xl object-contain shadow-soft sm:max-h-[78vh] sm:max-w-[820px]"
                  onError={() => setPaymentScreenshotError(true)}
                />
              ) : (
                <div className="flex min-h-[260px] w-[86vw] max-w-md flex-col items-center justify-center rounded-xl border border-destructive bg-destructive-soft p-6 text-center sm:min-h-[320px]">
                  <p className="text-lg font-semibold text-destructive">Could not load payment screenshot.</p>
                  <p className="mt-2 text-sm text-destructive">
                    Please check if the file URL is public or signed correctly.
                  </p>
                </div>
              )}
            </div>
          </StudioModal>
        </div>
      )}
    </div>
  );
}

export default function OrdersTable() {
  return (
    <ComponentErrorBoundary context="orders-table">
      <OrdersTableContent />
    </ComponentErrorBoundary>
  );
}
