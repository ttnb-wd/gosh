import type { SupabaseClient } from "@supabase/supabase-js";

type AuditAction =
  | "order_status_changed"
  | "payment_status_changed"
  | "product_created"
  | "product_updated"
  | "product_status_changed"
  | "product_deleted";

type AuditEntityType = "order" | "product";

type AuditPayload = {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel?: string | null;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export const logAdminAudit = async (
  supabase: SupabaseClient,
  {
    action,
    entityType,
    entityId,
    entityLabel = null,
    beforeData = {},
    afterData = {},
    metadata = {},
  }: AuditPayload
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("admin_audit_logs").insert({
      actor_email: user?.email || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      before_data: beforeData,
      after_data: afterData,
      metadata,
    });

    if (error) {
      console.error("Admin audit log failed:", error.message);
    }
  } catch (error) {
    console.error("Admin audit log failed:", error);
  }
};
