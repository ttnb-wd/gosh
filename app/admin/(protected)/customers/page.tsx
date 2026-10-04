"use client";
import StudioErrorText from "@/components/ui/StudioErrorText";
import StudioModal from "@/components/ui/StudioModal";
import devLog from "@/lib/dev-log";

import { useEffect, useState } from "react";
import StudioSelect from "@/components/ui/StudioSelect";
import AdminHeader from "@/components/admin/AdminHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { getFirebaseAuthorizationHeader } from "@/lib/firebase/client-auth";
import { Search, User, Mail, Phone, ShoppingBag, DollarSign, X, Crown } from "lucide-react";
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
  /*
   * The customers API call sends the Firebase ID token, which requires the
   * browser Firebase client auth to be fully restored after a page load.
   * Wait until it is restored + verified before fetching.
   */
  const { isAdmin, loading: authLoading } = useAdminAuth();

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
  const totalPages = Math.max(Math.ceil(totalCustomers / pageSize), 1);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    fetchCustomers();
  }, [currentPage, searchQuery, filterType, sortType, authLoading, isAdmin]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [customers, sortType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, sortType]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await getFirebaseAuthorizationHeader();

      const response = await fetch("/api/admin/customers/summaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          page: currentPage,
          pageSize,
          search: searchQuery.trim(),
          filter: filterType,
          sort: sortType,
        }),
      });
      const result = (await response.json()) as { data?: CustomerSummaryRow[]; error?: string };

      if (!response.ok || result.error) {
        devLog.error("Customers fetch error:", {
          message: result.error,
        });
        throw new Error(result.error || "Failed to fetch customers");
      }

      const rows = result.data || [];
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
      pending: "bg-accent-soft text-accent border-line",
      confirmed: "bg-info-soft text-info border-info",
      processing: "bg-info-soft text-info border-info",
      delivered: "bg-success-soft text-success border-success",
      cancelled: "bg-destructive-soft text-destructive border-destructive",
    };
    return styles[status.toLowerCase()] || "bg-surface-muted text-secondary border-line";
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Customers" subtitle="Manage customer information" />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-line bg-surface p-12 text-center shadow-soft">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-accent-soft"></div>
            <p className="mt-4 text-sm font-medium text-secondary">Loading customers...</p>
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
          <div className="rounded-xl border border-destructive bg-destructive-soft p-12 text-center shadow-soft">
            <p className="text-sm font-medium text-destructive"><StudioErrorText message={error} /></p>
            <button
              onClick={fetchCustomers}
              className="mt-4 rounded-xl bg-destructive px-6 py-2 text-sm font-semibold text-on-brand hover:bg-destructive"
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
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="admin-customer-search"
              name="admin_customer_search"
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface py-3 pl-12 pr-4 text-sm focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "all"
                  ? "bg-brand text-on-brand"
                  : "bg-surface text-secondary hover:bg-surface-muted border border-line"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("customers")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "customers"
                  ? "bg-brand text-on-brand"
                  : "bg-surface text-secondary hover:bg-surface-muted border border-line"
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setFilterType("admins")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "admins"
                  ? "bg-brand text-on-brand"
                  : "bg-surface text-secondary hover:bg-surface-muted border border-line"
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setFilterType("has_orders")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "has_orders"
                  ? "bg-brand text-on-brand"
                  : "bg-surface text-secondary hover:bg-surface-muted border border-line"
              }`}
            >
              Has Orders
            </button>
            <button
              onClick={() => setFilterType("no_orders")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filterType === "no_orders"
                  ? "bg-brand text-on-brand"
                  : "bg-surface text-secondary hover:bg-surface-muted border border-line"
              }`}
            >
              No Orders
            </button>

            <div className="w-full sm:ml-auto sm:w-56"><StudioSelect value={sortType} options={sortOptions} ariaLabel="Sort customers" onChange={value => setSortType(value as SortType)} /></div>
          </div>
        </div>

        {/* Customer Count */}
        <div className="mb-4">
          <p className="text-sm text-secondary">
            Showing <span className="font-bold text-ink">{filteredCustomers.length}</span> of{" "}
            <span className="font-bold text-ink">{totalCustomers}</span> customers
          </p>
        </div>

        {/* Customers List */}
        {filteredCustomers.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-12 text-center shadow-soft">
            <User className="mx-auto h-12 w-12 text-faint" />
            <h3 className="mt-4 text-lg font-bold text-ink">No customers found</h3>
            <p className="mt-2 text-sm text-secondary">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your search or filters"
                : "No customers found yet."}
            </p>
          </div>
        ) : (
          <div className="studio-table">
            <div className="studio-table-heading hidden grid-cols-[1.4fr_1fr_0.7fr_0.9fr_1fr_120px] gap-4 px-5 py-3 lg:grid">
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
                  className="studio-table-row grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_1fr_120px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-medium text-accent">
                      {displayName?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-ink">{displayName}</h3>
                      <p className="mt-0.5 text-xs font-semibold text-muted">
                        Joined {new Date(customer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-1 text-sm text-secondary">
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{displayPhone}</span>
                    </div>
                  </div>

                  <div>
                    {customer.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                        <Crown className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-secondary">
                        Customer
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-muted px-3 py-2 lg:block lg:bg-transparent lg:p-0">
                    <div>
                      <p className="text-xs font-bold text-muted lg:hidden">Orders</p>
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <ShoppingBag className="h-4 w-4 text-info" />
                        {customer.totalOrders}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted lg:hidden">Spent</p>
                      <p className="flex items-center gap-2 text-sm font-semibold text-success lg:mt-1">
                        <DollarSign className="h-4 w-4" />
                        {customer.totalSpent.toLocaleString()} MMK
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    {customer.lastOrderDate ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-secondary">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </p>
                        {customer.latestStatus && (
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusBadge(
                              customer.latestStatus
                            )}`}
                          >
                            {customer.latestStatus}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-muted">No orders yet</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openCustomerDetail(customer)}
                    aria-label={`View details for ${getCustomerDisplayName(customer)}`}
                    className="studio-compact-button w-full lg:w-auto"
                  >
                    Details
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-soft sm:flex-row">
            <p className="text-sm font-semibold text-secondary">
              Page <span className="font-semibold text-ink">{currentPage}</span> of{" "}
              <span className="font-semibold text-ink">{totalPages}</span>
            </p>
            <div className="flex w-full gap-3 sm:w-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1 || loading}
                aria-label="Go to previous page"
                className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                aria-label="Go to next page"
                className="flex-1 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
          <StudioModal label="Customer details" onDismiss={closeModal} lockScroll={true}
            className="w-full max-w-2xl rounded-xl border border-line bg-surface shadow-soft"
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-ink">Customer Details</h2>
                <p className="text-sm text-secondary">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-xl p-2 hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-bold text-accent">
                  {selectedCustomer.full_name?.[0]?.toUpperCase() || selectedCustomer.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">{selectedCustomer.full_name || "N/A"}</h3>
                  {selectedCustomer.role === "admin" && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
                      <Crown className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-4">
                  <Mail className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-xs text-secondary">Email</p>
                    <p className="font-semibold text-ink">{selectedCustomer.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-4">
                  <Phone className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-xs text-secondary">Phone</p>
                    <p className="font-semibold text-ink">{selectedCustomer.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-4">
                  <User className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-xs text-secondary">Role</p>
                    <p className="font-semibold capitalize text-ink">{selectedCustomer.role || "customer"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-info-soft p-4 text-center">
                    <ShoppingBag className="mx-auto mb-2 h-6 w-6 text-info" />
                    <p className="text-xs text-info">Total Orders</p>
                    <p className="mt-1 text-2xl font-bold text-info">{selectedCustomer.totalOrders}</p>
                  </div>

                  <div className="rounded-xl bg-success-soft p-4 text-center">
                    <DollarSign className="mx-auto mb-2 h-6 w-6 text-success" />
                    <p className="text-xs text-success">Total Spent</p>
                    <p className="mt-1 text-2xl font-bold text-success">
                      {selectedCustomer.totalSpent.toLocaleString()} MMK
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-line px-6 py-4">
              <button
                onClick={closeModal}
                className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-on-brand hover:bg-brand"
              >
                Close
              </button>
            </div>
          </StudioModal>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
