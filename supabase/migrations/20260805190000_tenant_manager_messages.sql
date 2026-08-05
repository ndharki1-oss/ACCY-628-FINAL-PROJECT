-- Tenant ↔ Harborline management message thread
CREATE TABLE public.tenant_manager_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('tenant', 'admin', 'owner')),
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_manager_messages_tenant_created
  ON public.tenant_manager_messages (tenant_id, created_at);

ALTER TABLE public.tenant_manager_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tmm_admin ON public.tenant_manager_messages
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY tmm_tenant_select ON public.tenant_manager_messages
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT private.tenant_ids_for_user()));

CREATE POLICY tmm_tenant_insert ON public.tenant_manager_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT private.tenant_ids_for_user())
    AND sender_role = 'tenant'
  );

-- Demo thread for Reed Analytics (demo tenant login)
INSERT INTO public.tenant_manager_messages (tenant_id, sender_role, sender_name, body, created_at)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    'admin',
    'Avery Morgan',
    'Welcome to Harborline Contact Management. Reach out anytime with lease or billing questions.',
    now() - interval '5 days'
  ),
  (
    '40000000-0000-0000-0000-000000000001',
    'tenant',
    'Taylor Reed',
    'Thanks! Can someone confirm the CAM estimate for next quarter?',
    now() - interval '4 days'
  ),
  (
    '40000000-0000-0000-0000-000000000001',
    'admin',
    'Avery Morgan',
    'Yes — we will send an updated CAM schedule by Friday. Let us know if you need anything else.',
    now() - interval '3 days'
  ),
  (
    '40000000-0000-0000-0000-000000000001',
    'owner',
    'Olivia Bennett',
    'From the ownership side, we appreciate your tenancy at South Loop. Happy to discuss renewal options when you are ready.',
    now() - interval '1 day'
  );
