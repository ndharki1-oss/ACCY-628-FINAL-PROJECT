-- Tenant request → WO auto-assign to Harborline staff by specialty.
-- No seed inserts. Reuses vendors.worker_type = 'staff'.
-- Reverse: ROLLBACK_20260806180000_tenant_wo_staff_assign.sql

CREATE TABLE IF NOT EXISTS public.specialty_assignment_cursor (
  specialty TEXT PRIMARY KEY,
  last_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.specialty_assignment_cursor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sac_admin ON public.specialty_assignment_cursor;
CREATE POLICY sac_admin ON public.specialty_assignment_cursor FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE OR REPLACE FUNCTION private.normalize_specialty(p_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(both FROM COALESCE(p_raw, '')))
    WHEN 'hvac' THEN 'HVAC'
    WHEN 'plumbing' THEN 'Plumbing'
    WHEN 'electrical' THEN 'Electrical'
    WHEN 'pest control' THEN 'Pest Control'
    WHEN 'general maintenance' THEN 'General Maintenance'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION private.pick_staff_for_specialty(p_specialty TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT := private.normalize_specialty(p_specialty);
  v_last UUID;
  v_pick UUID;
  v_ids UUID[];
BEGIN
  IF v_norm IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(v.id ORDER BY v.contact_name, v.id)
  INTO v_ids
  FROM public.vendors v
  WHERE v.active = true
    AND v.worker_type = 'staff'
    AND private.normalize_specialty(v.specialty) = v_norm;

  IF v_ids IS NULL OR cardinality(v_ids) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT last_vendor_id INTO v_last
  FROM public.specialty_assignment_cursor
  WHERE specialty = v_norm;

  IF v_last IS NULL OR NOT (v_last = ANY (v_ids)) THEN
    v_pick := v_ids[1];
  ELSE
    SELECT id INTO v_pick
    FROM unnest(v_ids) WITH ORDINALITY AS t(id, ord)
    WHERE ord > (
      SELECT ord FROM unnest(v_ids) WITH ORDINALITY AS x(id, ord) WHERE id = v_last
    )
    ORDER BY ord
    LIMIT 1;

    IF v_pick IS NULL THEN
      v_pick := v_ids[1];
    END IF;
  END IF;

  INSERT INTO public.specialty_assignment_cursor (specialty, last_vendor_id, updated_at)
  VALUES (v_norm, v_pick, now())
  ON CONFLICT (specialty) DO UPDATE
    SET last_vendor_id = EXCLUDED.last_vendor_id,
        updated_at = now();

  RETURN v_pick;
END;
$$;

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
  v_vendor_id UUID;
  v_status public.wo_status;
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

  v_vendor_id := private.pick_staff_for_specialty(NEW.service_type);
  v_status := CASE
    WHEN v_vendor_id IS NOT NULL THEN 'assigned'::public.wo_status
    ELSE 'open'::public.wo_status
  END;

  INSERT INTO public.work_orders (
    property_id,
    lease_id,
    vendor_id,
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
    v_vendor_id,
    v_wo_number,
    'tenant',
    v_status,
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
