-- Fix owner-portal RLS recursion and invoice visibility.
-- Selecting properties as an owner previously failed with:
-- "infinite recursion detected in policy for relation properties"
-- because properties policies queried leases/work_orders, whose policies
-- queried properties again.

CREATE OR REPLACE FUNCTION private.property_ids_for_owner()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.properties
  WHERE owner_id IN (SELECT id FROM public.owners WHERE profile_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.property_ids_for_tenant()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT property_id
  FROM public.leases
  WHERE tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.property_ids_for_vendor()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT property_id
  FROM public.work_orders
  WHERE vendor_id IN (SELECT id FROM public.vendors WHERE profile_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION private.property_ids_for_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION private.property_ids_for_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION private.property_ids_for_vendor() TO authenticated;

DROP POLICY IF EXISTS properties_owner_select ON public.properties;
DROP POLICY IF EXISTS properties_tenant_select ON public.properties;
DROP POLICY IF EXISTS properties_vendor_select ON public.properties;

CREATE POLICY properties_owner_select ON public.properties
  FOR SELECT TO authenticated
  USING (id IN (SELECT private.property_ids_for_owner()) OR private.is_admin());

CREATE POLICY properties_tenant_select ON public.properties
  FOR SELECT TO authenticated
  USING (id IN (SELECT private.property_ids_for_tenant()) OR private.is_admin());

CREATE POLICY properties_vendor_select ON public.properties
  FOR SELECT TO authenticated
  USING (id IN (SELECT private.property_ids_for_vendor()) OR private.is_admin());

DROP POLICY IF EXISTS leases_owner_select ON public.leases;
CREATE POLICY leases_owner_select ON public.leases
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT private.property_ids_for_owner()) OR private.is_admin());

DROP POLICY IF EXISTS wo_owner_select ON public.work_orders;
DROP POLICY IF EXISTS wo_owner_update ON public.work_orders;
CREATE POLICY wo_owner_select ON public.work_orders
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT private.property_ids_for_owner()) OR private.is_admin());
CREATE POLICY wo_owner_update ON public.work_orders
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT private.property_ids_for_owner()))
  WITH CHECK (property_id IN (SELECT private.property_ids_for_owner()));

DROP POLICY IF EXISTS deposits_owner ON public.security_deposits;
CREATE POLICY deposits_owner ON public.security_deposits
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT private.property_ids_for_owner()) OR private.is_admin());

DROP POLICY IF EXISTS requests_owner_select ON public.tenant_requests;
CREATE POLICY requests_owner_select ON public.tenant_requests
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT private.property_ids_for_owner()) OR private.is_admin());

DROP POLICY IF EXISTS invoices_owner_select ON public.invoices;
CREATE POLICY invoices_owner_select ON public.invoices
  FOR SELECT TO authenticated
  USING (
    owner_id IN (SELECT private.owner_ids_for_user())
    OR property_id IN (SELECT private.property_ids_for_owner())
    OR private.is_admin()
  );

-- Give the demo owner login something to approve.
UPDATE public.work_orders
SET
  status = 'pending_owner_approval',
  vendor_notes = COALESCE(NULLIF(vendor_notes, ''), 'Work completed. Awaiting owner approval before close-out.'),
  actual_cost = COALESCE(actual_cost, 1850)
WHERE property_id = '20000000-0000-0000-0000-000000000001'
  AND wo_number = 'WO-1';

UPDATE public.cost_entries
SET
  owner_approved = false,
  description = 'Roof restoration — exceeds approval threshold',
  amount = 6800
WHERE id = '5f94368a-710e-4460-bb6c-3af35a906d26';
