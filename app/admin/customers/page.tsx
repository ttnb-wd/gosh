"use client";

import { useEffect, useRef, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Check, ChevronDown, Search, User, Mail, Phone, ShoppingBag, DollarSign, X, Crown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  phone: string;
  total: number;
  status: string;
  created_at: string;
}

interface Customer extends Profile {
  orders: Order[];
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  latestStatus: string | null;
  latestCustomerName: string | null;
  latestPhone: string | null;
}

interface CustomerSummaryRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
  total_orders: number;
  total_spent: number | string;
  last_order_date: string | null;
  latest_status: string | null;
  latest_customer_name: string | null;
  latest_phone: string | null;
  total_count: number;
}

type FilterType = "all" | "customers" | "admins" | "has_orders" | "no_orders";
type SortType = "newest" | "oldest" | "highest_spent" | "most_orders";

const sortOptions: { value: SortType; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest_spent", label: "Highest Spent" },
  { value: "most_orders", label: "Most Orders" },
];
const pageSize = 20;

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const totalPages = Math.max(Math.ceil(totalCustomers / pageSize), 1);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, searchQuery, filterType, sortType]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [customers, sortType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, sortType]);

  useEffect(() => {
    if (!sortOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortOpen]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createSupabaseClient();
      const { data, error: summariesError } = await supabase.rpc("get_customer_summaries", {
        p_page: currentPage,
        p_page_size: pageSize,
        p_search: searchQuery.trim(),
        p_filter: filterType,
        p_sort: sortType,
      });

      if (summariesError) {
        console.error("Customers fetch error:", {
          message: summariesError.message,
          details: summariesError.details,
          hint: summariesError.hint,
          code: summariesError.code,
        });
        throw summariesError;
      }

      const rows = (data || []) as CustomerSummaryRow[];
      const customersData: Customer[] = rows.map((row) => ({
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        phone: row.phone,
        role: row.role,
        created_at: row.created_at,
        updated_at: row.updated_at,
        orders: [],
        totalOrders: Number(row.total_orders || 0),
        totalSpent: Number(row.total_spent || 0),
        lastOrderDate: row.last_order_date,
        latestStatus: row.latest_status,
        latestCustomerName: row.latest_customer_name,
        latestPhone: row.latest_phone,
      }));

      setCustomers(customersData);
      setFilteredCustomers(customersData);
      setTotalCustomers(rows[0]?.total_count || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers");
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
      customer.latestCustomerName ||
      customer.email?.split("@")[0] ||
      "Customer"
    );
  };

  const getCustomerPhone = (customer: Customer) => {
    return customer.phone || customer.latestPhone || "N/A";
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

      {/* Screen Reader Loading Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {loading ? "Loading customers, please wait..." : `${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''} loaded`}
      </div>

      <main role="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              id="admin-customer-search"
              name="admin_customer_search"
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

            <div ref={sortMenuRef} className="relative z-30 w-full sm:ml-auto sm:w-auto">
              <button
                type="button"
                onClick={() => setSortOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-yellow-300/80 bg-[#fffdf6] px-5 py-3 text-sm font-black text-neutral-900 shadow-[0_16px_38px_rgba(234,179,8,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-white focus:outline-none focus:ring-4 focus:ring-yellow-200/70 sm:min-w-[210px]"
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
              >
                <span>{sortOptions.find((option) => option.value === sortType)?.label}</span>
                <ChevronDown
                  className={`h-4 w-4 text-yellow-600 transition-transform duration-300 ${
                    sortOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {sortOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-full min-w-[230px] overflow-hidden rounded-[22px] border border-yellow-200 bg-[#fffdf6]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.18),0_0_32px_rgba(234,179,8,0.16)] backdrop-blur-xl"
                >
                  {sortOptions.map((option) => {
                    const active = sortType === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setSortType(option.value);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all duration-200 ${
                          active
                            ? "bg-yellow-400 text-black shadow-[0_10px_24px_rgba(234,179,8,0.24)]"
                            : "text-neutral-700 hover:bg-yellow-50 hover:text-yellow-700"
                        }`}
                      >
                        <span>{option.label}</span>
                        {active && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Count */}
        <div className="mb-4">
          <p className="text-sm text-zinc-600">
            Showing <span className="font-bold text-black">{filteredCustomers.length}</span> of{" "}
            <span className="font-bold text-black">{totalCustomers}</span> customers
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
          <div className="overflow-hidden rounded-[24px] border border-yellow-200/70 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
            <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_0.9fr_1fr_120px] gap-4 border-b border-yellow-100 bg-[#fffdf6] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-500 lg:grid">
              <span>Customer</span>
              <span>Contact</span>
              <span>Role</span>
              <span>Orders</span>
              <span>Last Order</span>
              <span className="text-right">Action</span>
            </div>

            {filteredCustomers.map((customer) => {
              const displayName = getCustomerDisplayName(customer);
              const displayPhone = getCustomerPhone(customer);

              return (
                <div
                  key={customer.id}
                  className="grid gap-4 border-b border-zinc-100 px-4 py-4 transition hover:bg-yellow-50/40 last:border-b-0 sm:px-5 lg:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_1fr_120px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-sm font-black text-yellow-700 ring-4 ring-yellow-50">
                      {displayName?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-black">{displayName}</h3>
                      <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                        Joined {new Date(customer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-1 text-sm text-zinc-700">
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-yellow-600" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-yellow-600" />
                      <span className="truncate">{displayPhone}</span>
                    </div>
                  </div>

                  <div>
                    {customer.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
                        <Crown className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                        Customer
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 px-3 py-2 lg:block lg:bg-transparent lg:p-0">
                    <div>
                      <p className="text-xs font-bold text-zinc-500 lg:hidden">Orders</p>
                      <p className="flex items-center gap-2 text-sm font-black text-black">
                        <ShoppingBag className="h-4 w-4 text-blue-600" />
                        {customer.totalOrders}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-500 lg:hidden">Spent</p>
                      <p className="flex items-center gap-2 text-sm font-black text-green-700 lg:mt-1">
                        <DollarSign className="h-4 w-4" />
                        {customer.totalSpent.toLocaleString()} MMK
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    {customer.lastOrderDate ? (
                      <div className="flex flex-wrap items-center gap-2">
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
                      <p className="text-sm font-semibold text-zinc-400">No orders yet</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openCustomerDetail(customer)}
                    className="w-full rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-[0_10px_24px_rgba(234,179,8,0.20)] transition hover:bg-yellow-300 lg:w-auto"
                  >
                    Details
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[22px] border border-yellow-200/70 bg-white px-4 py-3 shadow-sm sm:flex-row">
            <p className="text-sm font-semibold text-zinc-600">
              Page <span className="font-black text-black">{currentPage}</span> of{" "}
              <span className="font-black text-black">{totalPages}</span>
            </p>
            <div className="flex w-full gap-3 sm:w-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="flex-1 rounded-full border border-yellow-200 bg-[#fffdf6] px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                className="flex-1 rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Simple Customer Detail Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
          <motion.div
            className="w-full max-w-2xl rounded-[28px] border border-zinc-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
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
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
