-- Allow tenants to read Owner contact fields for properties they lease.
-- Read-only SELECT only; no seed/data row changes.

CREATE POLICY owners_tenant_select_leased_property ON public.owners
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT p.owner_id
      FROM public.properties p
      INNER JOIN public.leases l ON l.property_id = p.id
      WHERE l.tenant_id IN (SELECT private.tenant_ids_for_user())
    )
  );
