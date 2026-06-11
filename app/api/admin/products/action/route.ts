import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type ProductActionBody =
  | {
      action: "save";
      productId?: string | null;
      product: Record<string, unknown>;
    }
  | {
      action: "setActive";
      productId: string;
      isActive: boolean;
    }
  | {
      action: "delete";
      productId: string;
    };

export async function POST(request: Request) {
  try {
    const user = await requireAdminApiAuth(request);
    const body = (await request.json()) as ProductActionBody;
    const supabase = getSupabaseAdmin();

    if (body.action === "save") {
      const { data, error } = await supabase.rpc("server_admin_save_product", {
        p_actor_id: user.id,
        p_actor_email: user.email || null,
        p_product_id: body.productId || null,
        p_product: body.product,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    if (body.action === "setActive") {
      const { data, error } = await supabase.rpc("server_admin_set_product_active", {
        p_actor_id: user.id,
        p_actor_email: user.email || null,
        p_product_id: body.productId,
        p_is_active: body.isActive,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    if (body.action === "delete") {
      const { data, error } = await supabase.rpc("server_admin_delete_product", {
        p_actor_id: user.id,
        p_actor_email: user.email || null,
        p_product_id: body.productId,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid product action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product action failed.";
    const status = message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
