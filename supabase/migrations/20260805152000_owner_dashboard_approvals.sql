-- Let owners see tenant/vendor context and act on maintenance requests.

CREATE POLICY tenants_owner_select ON public.tenants
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT l.tenant_id
      FROM public.leases l
      WHERE l.property_id IN (SELECT private.property_ids_for_owner())
    )
    OR private.is_admin()
  );

CREATE POLICY vendors_owner_select ON public.vendors
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT w.vendor_id
      FROM public.work_orders w
      WHERE w.vendor_id IS NOT NULL
        AND w.property_id IN (SELECT private.property_ids_for_owner())
    )
    OR private.is_admin()
  );

CREATE POLICY requests_owner_update ON public.tenant_requests
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT private.property_ids_for_owner()))
  WITH CHECK (property_id IN (SELECT private.property_ids_for_owner()));
