import "server-only";

import { adminDb } from "./admin";

export type CustomerSummaryRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  latest_status: string | null;
  latest_customer_name: string | null;
  latest_phone: string | null;
  total_count: number;
};

type CustomerAggregate = Omit<CustomerSummaryRow, "total_count">;

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  // Firestore Timestamp
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();

  return null;
}

export async function getCustomerSummaries(input: {
  page: number;
  pageSize: number;
  search: string;
  filter: string;
  sort: string;
}): Promise<CustomerSummaryRow[]> {
  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.max(1, Number(input.pageSize) || 20);

  const usersSnap = await adminDb.collection("users").get();

  const users: Array<{
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string | null;
    created_at: string | null;
    updated_at: string | null;
  }> = usersSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      email: typeof data.email === "string" ? data.email : "",
      full_name: typeof data.full_name === "string" ? data.full_name : null,
      phone: typeof data.phone === "string" ? data.phone : null,
      role: typeof data.role === "string" ? data.role : null,
      created_at: toIso(data.created_at),
      updated_at: toIso(data.updated_at),
    };
  });

  const ordersSnap = await adminDb.collection("orders").get();

  const aggregateByUser = new Map<
    string,
    {
      total_orders: number;
      total_spent: number;
      last_order_date: string | null;
      latest_status: string | null;
      latest_customer_name: string | null;
      latest_phone: string | null;
      last_order_created: number;
    }
  >();

  ordersSnap.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const userId = typeof data.user_id === "string" ? data.user_id : null;
    if (!userId) return;

    const existing = aggregateByUser.get(userId) || {
      total_orders: 0,
      total_spent: 0,
      last_order_date: null,
      latest_status: null,
      latest_customer_name: null,
      latest_phone: null,
      last_order_created: 0,
    };

    existing.total_orders += 1;
    existing.total_spent += Number(data.total ?? 0) || 0;

    const createdMs =
      typeof data.created_at === "object" && data.created_at
        ? (data.created_at as { toMillis?: () => number }).toMillis?.() ?? 0
        : 0;

    if (createdMs > existing.last_order_created) {
      existing.last_order_created = createdMs;
      existing.last_order_date = toIso(data.created_at);
      existing.latest_status = typeof data.status === "string" ? data.status : null;
      existing.latest_customer_name =
        typeof data.customer_name === "string" ? data.customer_name : null;
      existing.latest_phone = typeof data.phone === "string" ? data.phone : null;
    }

    aggregateByUser.set(userId, existing);
  });

  const rows: CustomerAggregate[] = users.map((user) => {
    const agg = aggregateByUser.get(user.id);

    return {
      ...user,
      total_orders: agg?.total_orders ?? 0,
      total_spent: agg?.total_spent ?? 0,
      last_order_date: agg?.last_order_date ?? null,
      latest_status: agg?.latest_status ?? null,
      latest_customer_name: agg?.latest_customer_name ?? null,
      latest_phone: agg?.latest_phone ?? null,
    };
  });

  const search = input.search.trim().toLowerCase();
  const filter = input.filter || "all";
  const sort = input.sort || "newest";

  let filtered = rows;

  if (search) {
    filtered = filtered.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search)
    );
  }

  switch (filter) {
    case "customers":
      filtered = filtered.filter((c) => c.role !== "admin");
      break;
    case "admins":
      filtered = filtered.filter((c) => c.role === "admin");
      break;
    case "has_orders":
      filtered = filtered.filter((c) => c.total_orders > 0);
      break;
    case "no_orders":
      filtered = filtered.filter((c) => c.total_orders === 0);
      break;
  }

  switch (sort) {
    case "newest":
      filtered.sort(
        (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
      break;
    case "oldest":
      filtered.sort(
        (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")
      );
      break;
    case "highest_spent":
      filtered.sort((a, b) => b.total_spent - a.total_spent);
      break;
    case "most_orders":
      filtered.sort((a, b) => b.total_orders - a.total_orders);
      break;
  }

  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return paged.map((row) => ({ ...row, total_count: totalCount }));
}