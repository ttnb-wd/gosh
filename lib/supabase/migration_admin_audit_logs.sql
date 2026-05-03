-- Run this in Supabase SQL Editor to track important admin changes.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL CHECK (
    action IN (
      'order_status_changed',
      'payment_status_changed',
      'product_created',
      'product_updated',
      'product_status_changed',
      'product_deleted'
    )
  ),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'product')),
  entity_id TEXT NOT NULL,
  entity_label TEXT,
  before_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity
  ON public.admin_audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id
  ON public.admin_audit_logs(actor_id);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_admin_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_select"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_audit_logs_admin_insert" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_insert"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
