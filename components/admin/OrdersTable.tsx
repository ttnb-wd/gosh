"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ChevronLeft, ChevronRight, Clock, ExternalLink, Package, Search, XCircle } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import PremiumStatusSelect from "@/components/admin/PremiumStatusSelect";

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

export default function OrdersTable() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const searchParams = useSearchParams();
  const orderIdFromNotification = searchParams.get("orderId");
  const statusFromUrl = searchParams.get("status");
  const paymentFromUrl = searchParams.get("payment");
  
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

      const from = (currentPage - 1) * ORDERS_PER_PAGE;
      const to = from + ORDERS_PER_PAGE - 1;
      const search = searchQuery.trim();

      let query = supabase
        .from("orders")
        .select("*, order_items(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filter !== "All") {
        query = query.eq("status", filter);
      }

      if (paymentFilter !== "All") {
        query = query.eq("payment_status", paymentFilter);
      }

      if (search) {
        const escapedSearch = search.replace(/[%_]/g, "\\$&");
        query = query.or(
          `order_number.ilike.%${escapedSearch}%,customer_name.ilike.%${escapedSearch}%,customer_email.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error loading orders:", error);
        return;
      }

      setOrders((data || []) as Order[]);
      setTotalOrders(count || 0);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, paymentFilter, searchQuery, supabase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  const getPaymentScreenshotUrl = async (pathOrUrl: string) => {
    if (!pathOrUrl) return null;
    
    // If already a full public URL, use directly
    if (pathOrUrl.startsWith("http")) {
      return pathOrUrl;
    }
    
    // If only storage path is saved, create signed URL
    const { data, error } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(pathOrUrl, 60 * 10);
    
    if (error) {
      console.error("Create signed screenshot URL error:", {
        message: error.message,
      });
      return null;
    }
    
    return data.signedUrl;
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    const previousOrder = orders.find((order) => order.id === orderId);
    const previousStatus = previousOrder?.status;

    setUpdatingOrders(prev => new Set(prev).add(orderId));
    try {
      const { data: updatedOrderData, error } = await supabase.rpc("admin_update_order_status", {
        p_order_id: orderId,
        p_status: newStatus,
      });

      if (error) {
        console.error("Error updating order status:", error);
        setActionMessage({ type: "error", text: "Failed to update order status." });
        return;
      }

      const updatedOrder = Array.isArray(updatedOrderData) ? updatedOrderData[0] : updatedOrderData;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, ...(updatedOrder || {}), status: newStatus } : order
      ));
      setActionMessage({ type: "success", text: "Order status updated." });

      if (previousStatus && previousStatus !== newStatus) {
        void supabase.auth.getSession().then((response: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
          const { data } = response;
          const accessToken = data.session?.access_token;
          if (!accessToken) return;

          return fetch("/api/admin/email/order-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              orderId,
              previousStatus,
              nextStatus: newStatus,
            }),
          }).catch((emailError) => {
            console.error("Order status email failed:", emailError);
          });
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
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
      const { data: updatedOrderData, error } = await supabase.rpc("admin_update_payment_status", {
        p_order_id: orderId,
        p_payment_status: newPaymentStatus,
      });

      if (error) {
        console.error("Error updating payment status:", error);
        setActionMessage({ type: "error", text: "Failed to update payment status." });
        return;
      }

      const updatedOrder = Array.isArray(updatedOrderData) ? updatedOrderData[0] : updatedOrderData;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, ...(updatedOrder || {}), payment_status: newPaymentStatus } : order
      ));
      setActionMessage({ type: "success", text: "Payment status updated." });
    } catch (error) {
      console.error("Error updating payment status:", error);
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
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
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
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Confirmed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Processing":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Delivered":
        return "bg-green-100 text-green-700 border-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  if (loading && orders.length === 0 && totalOrders === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="rounded-full px-2 py-1 text-xs font-black opacity-70 transition hover:bg-white/70 hover:opacity-100"
          >
            Close
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            id="admin-order-search"
            name="admin_order_search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search order number, customer, email, or phone..."
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                filter === status
                  ? "bg-yellow-400 text-black shadow-md"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-yellow-400 hover:bg-yellow-50"
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
                  ? "bg-black text-white shadow-md"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-yellow-400 hover:bg-yellow-50"
              }`}
            >
              {status === "All" ? "All Payments" : status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-[24px] border border-yellow-200 bg-[#fffdf6] p-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(paymentStatusGuidance).map(([status, description]) => (
          <div key={status} className="rounded-2xl border border-yellow-100 bg-white p-3">
            <p className="text-sm font-black text-neutral-950">{status}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p>
          </div>
        ))}
      </div>

      {/* Notification Order Not Found Message */}
      {notificationOrderNotFound && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-bold text-yellow-800">
            Related order could not be found.
          </p>
          <p className="mt-1 text-xs text-yellow-700">
            The order may have been deleted or the notification link is invalid.
          </p>
        </div>
      )}

      {!loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
          <p>
            Showing <span className="font-bold text-black">{pageStart}</span>-<span className="font-bold text-black">{pageEnd}</span> of{" "}
            <span className="font-bold text-black">{totalOrders}</span> orders
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="rounded-full bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-600">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-lg font-bold text-black">No orders found</h3>
          <p className="mt-2 text-sm text-zinc-600">Orders will appear here once customers place them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isHighlighted = order.id === orderIdFromNotification;
            
            return (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className={`rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md ${
                  isHighlighted
                    ? "ring-2 ring-yellow-300 border-yellow-300 bg-yellow-50/50"
                    : "border-zinc-200 hover:border-yellow-400/50"
                }`}
              >
              <div className="p-6">
                {/* Order Header */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-black">{order.order_number}</h3>
                    <p className="text-sm text-zinc-600">
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
                    <span className="text-xl font-black text-yellow-600">${order.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Customer</p>
                    <p className="mt-1 font-semibold text-black">{order.customer_name}</p>
                    <p className="text-sm text-zinc-600">{order.phone}</p>
                    {order.customer_email && (
                      <p className="text-sm text-zinc-600">{order.customer_email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Address</p>
                    <p className="mt-1 text-sm text-zinc-700">{order.address}</p>
                    {order.city && <p className="text-sm text-zinc-600">{order.city}</p>}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Payment Information</p>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-700">Method:</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentMethodBadgeColor(order.payment_method)}`}>
                        {getPaymentMethodLabel(order.payment_method)}
                      </span>
                    </div>
                    
                    {/* Payment Account Details */}
                    {order.payment_account_name && (
                      <p className="text-sm text-zinc-600">
                        <span className="font-semibold">Account:</span> {order.payment_account_name}
                      </p>
                    )}
                    {order.payment_phone && (
                      <p className="text-sm text-zinc-600">
                        <span className="font-semibold">Phone:</span> {order.payment_phone}
                      </p>
                    )}
                    {order.payment_account_number && (
                      <p className="text-sm text-zinc-600">
                        <span className="font-semibold">Account Number:</span> {order.payment_account_number}
                      </p>
                    )}
                    
                    {/* Payment Screenshot */}
                    {order.payment_screenshot_url ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setPaymentScreenshotError(false);
                          const url = await getPaymentScreenshotUrl(order.payment_screenshot_url || "");
                          if (!url) {
                            setPaymentScreenshotError(true);
                            setPaymentScreenshotUrl("error");
                            return;
                          }
                          setPaymentScreenshotUrl(url);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-white px-4 py-2 text-sm font-black text-yellow-700 shadow-sm transition hover:bg-yellow-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Payment Screenshot
                      </button>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                        No Screenshot
                      </span>
                    )}

                    {prepaidPaymentMethods.has(order.payment_method) && !order.payment_screenshot_url && order.payment_status !== "Paid" && (
                      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        Prepaid order has no payment proof. Keep as Verifying/Failed until proof is confirmed.
                      </div>
                    )}

                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                      <span className="font-black">{order.payment_status || "Unpaid"}:</span>{" "}
                      {paymentStatusGuidance[order.payment_status || "Unpaid"] || "Review this payment before fulfillment."}
                    </div>
                    
                    {/* Payment Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-700">Status:</span>
                      <PremiumStatusSelect
                        type="payment"
                        value={order.payment_status || "Unpaid"}
                        onChange={(value) => updatePaymentStatus(order.id, value)}
                        disabled={updatingOrders.has(order.id)}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Items</p>
                  <div className="space-y-2">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3">
                          <div>
                            <p className="font-semibold text-black">{item.product_name}</p>
                            <p className="text-xs text-zinc-600">
                              {item.product_brand && `${item.product_brand} • `}
                              {item.selected_size && `${item.selected_size} • `}
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-black">${item.price.toFixed(2)}</p>
                            <p className="text-xs text-zinc-600">
                              Total: ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No items found</p>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="mb-4 rounded-xl bg-zinc-50 p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Subtotal:</span>
                      <span className="font-semibold text-black">${order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Delivery Fee:</span>
                        <span className="font-semibold text-black">${order.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Discount:</span>
                        <span className="font-semibold text-green-600">-${order.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-zinc-200 pt-1">
                      <span className="font-bold text-black">Total:</span>
                      <span className="font-bold text-yellow-600">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Status Dropdown */}
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Order Status:</p>
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-6"
          onClick={() => {
            setPaymentScreenshotUrl(null);
            setPaymentScreenshotError(false);
          }}
        >
          <div
            className="relative inline-flex max-h-[92vh] w-auto max-w-[94vw] flex-col overflow-hidden rounded-[28px] border border-yellow-200 bg-[#fffdf6] shadow-[0_30px_100px_rgba(0,0,0,0.40)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-yellow-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-600 sm:text-xs">Payment Proof</p>
                <h3 className="truncate text-base font-black text-neutral-950 sm:text-lg">Payment Screenshot</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentScreenshotUrl(null);
                  setPaymentScreenshotError(false);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-lg font-black text-black shadow-[0_10px_25px_rgba(234,179,8,0.30)] transition hover:bg-yellow-300 sm:h-10 sm:w-10"
                aria-label="Close payment screenshot"
              >
                ×
              </button>
            </div>
            {/* Screenshot preview */}
            <div className="flex items-center justify-center overflow-auto bg-neutral-950 p-2 sm:p-3">
              {!paymentScreenshotError && paymentScreenshotUrl !== "error" ? (
                <img
                  src={paymentScreenshotUrl}
                  alt="Payment screenshot from Supabase Storage"
                  className="block h-auto w-auto max-h-[76vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl sm:max-h-[78vh] sm:max-w-[820px]"
                  onError={() => setPaymentScreenshotError(true)}
                />
              ) : (
                <div className="flex min-h-[260px] w-[86vw] max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:min-h-[320px]">
                  <p className="text-lg font-black text-red-700">Could not load payment screenshot.</p>
                  <p className="mt-2 text-sm text-red-600">
                    Please check if the Supabase Storage file URL is public or signed correctly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
