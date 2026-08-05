-- Link tenant maintenance requests to admin work orders.

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS tenant_request_id UUID UNIQUE
    REFERENCES public.tenant_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wo_tenant_request
  ON public.work_orders(tenant_request_id);

CREATE OR REPLACE FUNCTION private.create_wo_for_tenant_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_lease_id UUID;
  v_wo_number TEXT;
  v_description TEXT;
BEGIN
  -- Avoid creating duplicates if a work order already exists for this request.
  IF EXISTS (
    SELECT 1 FROM public.work_orders WHERE tenant_request_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  v_property_id := NEW.property_id;
  v_lease_id := NEW.lease_id;

  IF v_property_id IS NULL AND v_lease_id IS NOT NULL THEN
    SELECT property_id INTO v_property_id
    FROM public.leases
    WHERE id = v_lease_id;
  END IF;

  -- work_orders.property_id is required; skip if we cannot resolve a property.
  IF v_property_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_wo_number :=
    'TR-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(NEW.id::text, '-', ''), 1, 8));

  v_description := trim(both E'\n' from concat_ws(
    E'\n',
    NULLIF(NEW.description, ''),
    'Service type: ' || COALESCE(NEW.service_type, 'Not specified'),
    'Recurring issue: ' || CASE WHEN COALESCE(NEW.recurring_issue, false) THEN 'Yes' ELSE 'No' END,
    'Requested date: ' || COALESCE(NEW.request_date::text, 'Not specified'),
    'Source: Tenant maintenance request'
  ));

  INSERT INTO public.work_orders (
    property_id,
    lease_id,
    wo_number,
    wo_type,
    status,
    title,
    description,
    scheduled_date,
    requires_owner_approval,
    tenant_request_id
  ) VALUES (
    v_property_id,
    v_lease_id,
    v_wo_number,
    'tenant',
    'open',
    NEW.title,
    v_description,
    COALESCE(NEW.request_date, CURRENT_DATE),
    false,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_request_create_wo ON public.tenant_requests;
CREATE TRIGGER trg_tenant_request_create_wo
AFTER INSERT ON public.tenant_requests
FOR EACH ROW
EXECUTE FUNCTION private.create_wo_for_tenant_request();
