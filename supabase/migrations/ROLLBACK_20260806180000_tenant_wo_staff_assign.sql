-- ROLLBACK for 20260806180000_tenant_wo_staff_assign.sql
-- Restores pre-feature tenant→WO creator. Does not delete work_orders.

DROP TRIGGER IF EXISTS trg_tenant_request_create_wo ON public.tenant_requests;

DROP FUNCTION IF EXISTS private.pick_staff_for_specialty(TEXT);
DROP FUNCTION IF EXISTS private.normalize_specialty(TEXT);
DROP TABLE IF EXISTS public.specialty_assignment_cursor;

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

-- App reverse: restore src/app/admin/work-orders/page.tsx from git;
-- delete this file and 20260806180000_tenant_wo_staff_assign.sql
