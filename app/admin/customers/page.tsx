"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Search, User, Mail, Phone, ShoppingBag, DollarSign, Calendar, X, Crown } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_brand: string;
  product_image: string;
  selected_size: string;
  price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  phone: string;
  address: string;
  city: string;
  payment_method: string;
  payment_screenshot_url: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: string;
  payment_status: string;
  admin_note: string | null;
  payment_phone: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

interface Customer extends Profile {
  orders: Order[];
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  latestStatus: string | null;
}

type FilterType = "all" | "customers" | "admins" | "has_orders" | "no_orders";
type SortType = "newest" | "oldest" | "highest_spent" | "most_orders";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, searchQuery, filterType, sortType]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createSupabaseClient();

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Customers fetch error:", {
          message: profilesError.message,
          details: profilesError.details,
          hint: profilesError.hint,
          code: profilesError.code,
        });
        throw profilesError;
      }

      // Fetch orders with order_items
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Orders fetch error:", {
          message: ordersError.message,
          details: ordersError.details,
          hint: ordersError.hint,
          code: ordersError.code,
        });
        throw ordersError;
      }

      // Merge data
      const customersData: Customer[] = (profiles || []).map((profile) => {
        const customerOrders = (orders || []).filter(
          (order) =>
            order.user_id === profile.id ||
            order.customer_email?.toLowerCase() === profile.email?.toLowerCase()
        );

        const totalOrders = customerOrders.length;
        const totalSpent = customerOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );
        const lastOrder = customerOrders[0];

        return {
          ...profile,
          orders: customerOrders,
          totalOrders,
          totalSpent,
          lastOrderDate: lastOrder?.created_at || null,
          latestStatus: lastOrder?.status || null,
        };
      });

      setCustomers(customersData);
    } catch (err: any) {
      setError(err.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...customers];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.full_name?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.phone?.toLowerCase().includes(query)
      );
    }

    // Filter
    switch (filterType) {
      case "customers":
        filtered = filtered.filter((c) => c.role !== "admin");
        break;
      case "admins":
        filtered = filtered.filter((c) => c.role === "admin");
        break;
      case "has_orders":
        filtered = filtered.filter((c) => c.totalOrders > 0);
        break;
      case "no_orders":
        filtered = filtered.filter((c) => c.totalOrders === 0);
        break;
    }

    // Sort
    switch (sortType) {
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "highest_spent":
        filtered.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case "most_orders":
        filtered.sort((a, b) => b.totalOrders - a.totalOrders);
        break;
    }

    setFilteredCustomers(filtered);
  };

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const closeModal = () => {
    setSelectedCustomer(null);
  };

  const getCustomerDisplayName = (customer: Customer) => {
    return (
      customer.full_name ||
      customer.orders?.[0]?.customer_name ||
      customer.email?.split("@")[0] ||
      "Customer"
    );
  };

  const getCustomerPhone = (customer: Customer) => {
    return customer.phone || customer.orders?.[0]?.phone || "N/A";
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      confirmed: "bg-blue-100 text-blue-700 border-blue-200",
      processing: "bg-purple-100 text-purple-700 border-purple-200",
      delivered: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };
    return styles[status.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Customers" subtitle="Manage customer information" />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-yellow-100"></div>
            <p className="mt-4 text-sm font-medium text-zinc-600">Loading customers...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Customers" subtitle="Manage customer information" />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-4 rounded-xl bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Customers" subtitle="Manage customer information" />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "all"
                  ? "bg-yellow-400 text-black"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("customers")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "customers"
                  ? "bg-yellow-400 text-black"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200"
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setFilterType("admins")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "admins"
                  ? "bg-yellow-400 text-black"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200"
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setFilterType("has_orders")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "has_orders"
                  ? "bg-yellow-400 text-black"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200"
              }`}
            >
              Has Orders
            </button>
            <button
              onClick={() => setFilterType("no_orders")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "no_orders"
                  ? "bg-yellow-400 text-black"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200"
              }`}
            >
              No Orders
            </button>

            <div className="w-full sm:ml-auto sm:w-auto">
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 sm:w-auto"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest_spent">Highest Spent</option>
                <option value="most_orders">Most Orders</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Count */}
        <div className="mb-4">
          <p className="text-sm text-zinc-600">
            Showing <span className="font-bold text-black">{filteredCustomers.length}</span> of{" "}
            <span className="font-bold text-black">{customers.length}</span> customers
          </p>
        </div>

        {/* Customers List */}
        {filteredCustomers.length === 0 ? (
          <div className="rounded-[28px] border border-zinc-200 bg-white p-12 text-center shadow-sm">
            <User className="mx-auto h-12 w-12 text-zinc-300" />
            <h3 className="mt-4 text-lg font-bold text-black">No customers found</h3>
            <p className="mt-2 text-sm text-zinc-600">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your search or filters"
                : "No customers found yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCustomers.map((customer) => {
              const displayName = getCustomerDisplayName(customer);
              const displayPhone = getCustomerPhone(customer);

              return (
                <div
                  key={customer.id}
                  className="group overflow-hidden rounded-[28px] border border-yellow-200/70 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300 hover:shadow-[0_24px_70px_rgba(234,179,8,0.14)]"
                >
                  <div className="border-b border-yellow-100 bg-gradient-to-br from-[#fffdf6] to-white p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-lg font-black text-yellow-700 ring-4 ring-yellow-50">
                        {displayName?.[0]?.toUpperCase() || "C"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-black text-black">
                              {displayName}
                            </h3>
                            <p className="mt-1 truncate text-sm font-medium text-zinc-500">
                              Joined {new Date(customer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {customer.role === "admin" ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
                              <Crown className="h-3 w-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                              Customer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
                        <Mail className="h-4 w-4 shrink-0 text-yellow-600" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
                        <Phone className="h-4 w-4 shrink-0 text-yellow-600" />
                        <span className="truncate">{displayPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-blue-50 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                          <ShoppingBag className="h-4 w-4" />
                          Orders
                        </div>
                        <p className="mt-2 text-2xl font-black text-blue-700">
                          {customer.totalOrders}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-green-50 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                          <DollarSign className="h-4 w-4" />
                          Spent
                        </div>
                        <p className="mt-2 text-lg font-black text-green-700">
                          {customer.totalSpent.toLocaleString()} MMK
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                        Last Order
                      </p>
                      {customer.lastOrderDate ? (
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-zinc-700">
                            {new Date(customer.lastOrderDate).toLocaleDateString()}
                          </p>
                          {customer.latestStatus && (
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${getStatusBadge(
                                customer.latestStatus
                              )}`}
                            >
                              {customer.latestStatus}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-zinc-400">No orders yet</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openCustomerDetail(customer)}
                      className="mt-5 w-full rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-[0_12px_30px_rgba(234,179,8,0.25)] transition hover:bg-yellow-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Simple Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-black">Customer Details</h2>
                <p className="text-sm text-zinc-600">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-xl p-2 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-2xl font-bold text-yellow-700">
                  {selectedCustomer.full_name?.[0]?.toUpperCase() || selectedCustomer.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black">{selectedCustomer.full_name || "N/A"}</h3>
                  {selectedCustomer.role === "admin" && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
                      <Crown className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4">
                  <Mail className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-xs text-zinc-600">Email</p>
                    <p className="font-semibold text-black">{selectedCustomer.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4">
                  <Phone className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-xs text-zinc-600">Phone</p>
                    <p className="font-semibold text-black">{selectedCustomer.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4">
                  <User className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-xs text-zinc-600">Role</p>
                    <p className="font-semibold capitalize text-black">{selectedCustomer.role || "customer"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-blue-50 p-4 text-center">
                    <ShoppingBag className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-xs text-blue-600">Total Orders</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">{selectedCustomer.totalOrders}</p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4 text-center">
                    <DollarSign className="mx-auto mb-2 h-6 w-6 text-green-600" />
                    <p className="text-xs text-green-600">Total Spent</p>
                    <p className="mt-1 text-2xl font-bold text-green-700">
                      {selectedCustomer.totalSpent.toLocaleString()} MMK
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 px-6 py-4">
              <button
                onClick={closeModal}
                className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
