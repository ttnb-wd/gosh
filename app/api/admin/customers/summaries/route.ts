import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { getCustomerSummaries } from "@/lib/firebase/customers-server";

export async function POST(request: Request) {
  try {
    await requireAdminApiAuth(request);
    const body = (await request.json()) as {
      page?: number;
      pageSize?: number;
      search?: string;
      filter?: string;
      sort?: string;
    };

    const data = await getCustomerSummaries({
      page: body.page || 1,
      pageSize: body.pageSize || 20,
      search: body.search || "",
      filter: body.filter || "all",
      sort: body.sort || "newest",
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Customer summaries failed.";
    const status = message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
