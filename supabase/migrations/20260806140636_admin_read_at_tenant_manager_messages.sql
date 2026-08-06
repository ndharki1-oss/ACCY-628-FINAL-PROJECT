-- Admin inbox read tracking for tenant → management messages.
-- Preserves original sender, body, and created_at.
ALTER TABLE public.tenant_manager_messages
  ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_manager_messages_admin_unread
  ON public.tenant_manager_messages (admin_read_at, created_at DESC)
  WHERE sender_role = 'tenant';
