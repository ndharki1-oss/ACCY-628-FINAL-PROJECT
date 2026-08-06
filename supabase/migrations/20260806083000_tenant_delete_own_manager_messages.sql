-- Allow tenants to remove their own Contact Management messages
CREATE POLICY tmm_tenant_delete ON public.tenant_manager_messages
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT private.tenant_ids_for_user())
    AND sender_role = 'tenant'
  );
