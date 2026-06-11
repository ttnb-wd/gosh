import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireAdminApiAuth(request);
    const body = (await request.json()) as {
      page?: number;
      pageSize?: number;
      search?: string;
      filter?: string;
      sort?: string;
    };
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("server_get_customer_summaries", {
      p_actor_id: user.id,
      p_actor_email: user.email || null,
      p_page: body.page || 1,
      p_page_size: body.pageSize || 20,
      p_search: body.search || "",
      p_filter: body.filter || "all",
      p_sort: body.sort || "newest",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Customer summaries failed.";
    const status = message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
