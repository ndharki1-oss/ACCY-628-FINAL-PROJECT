-- Owner ↔ Harborline management message threads (schema + RLS only; no seed data)
CREATE TABLE public.owner_manager_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'admin')),
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_read_at TIMESTAMPTZ
);

CREATE INDEX idx_owner_manager_messages_owner_created
  ON public.owner_manager_messages (owner_id, created_at);

CREATE INDEX idx_owner_manager_messages_admin_unread
  ON public.owner_manager_messages (admin_read_at, created_at DESC)
  WHERE sender_role = 'owner' AND admin_read_at IS NULL;

ALTER TABLE public.owner_manager_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY omm_admin ON public.owner_manager_messages
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY omm_owner_select ON public.owner_manager_messages
  FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()));

CREATE POLICY omm_owner_insert ON public.owner_manager_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id IN (SELECT private.owner_ids_for_user())
    AND sender_role = 'owner'
  );

CREATE POLICY omm_owner_delete ON public.owner_manager_messages
  FOR DELETE TO authenticated
  USING (
    owner_id IN (SELECT private.owner_ids_for_user())
    AND sender_role = 'owner'
  );
