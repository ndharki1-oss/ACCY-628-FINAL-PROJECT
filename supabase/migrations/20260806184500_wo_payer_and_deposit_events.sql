-- WO payer rules + deposit events + historical reclass (additive; no seed deletes).
-- In-house (≤ threshold / non-escalated): company-paid cost_entries.
-- Escalated (owner approval path): owner-paid; contractor Victor Chen after approve.

-- 1) Cost payor
ALTER TABLE public.cost_entries
  ADD COLUMN IF NOT EXISTS paid_by TEXT NOT NULL DEFAULT 'owner'
  CHECK (paid_by IN ('owner', 'company'));

COMMENT ON COLUMN public.cost_entries.paid_by IS
  'owner = property OpEx on owner books/statements; company = Harborline absorbs (in-house).';

CREATE INDEX IF NOT EXISTS idx_cost_paid_by ON public.cost_entries(paid_by);

-- Owners only see owner-paid costs
DROP POLICY IF EXISTS costs_owner_select ON public.cost_entries;
CREATE POLICY costs_owner_select ON public.cost_entries FOR SELECT TO authenticated
  USING (
    paid_by = 'owner'
    AND owner_id IN (SELECT private.owner_ids_for_user())
  );

DROP POLICY IF EXISTS costs_owner_update ON public.cost_entries;
CREATE POLICY costs_owner_update ON public.cost_entries FOR UPDATE TO authenticated
  USING (
    paid_by = 'owner'
    AND owner_id IN (SELECT private.owner_ids_for_user())
  )
  WITH CHECK (
    paid_by = 'owner'
    AND owner_id IN (SELECT private.owner_ids_for_user())
  );

-- Company-paid costs cannot be billed on owner statements
CREATE OR REPLACE FUNCTION private.enforce_company_cost_not_on_statement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.paid_by = 'company' AND NEW.billed_on_statement = true THEN
    RAISE EXCEPTION 'Company-paid costs cannot be billed on owner statements';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_cost_not_on_statement ON public.cost_entries;
CREATE TRIGGER trg_company_cost_not_on_statement
  BEFORE INSERT OR UPDATE ON public.cost_entries
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_company_cost_not_on_statement();

-- 2) Deposit activity ledger
CREATE TABLE IF NOT EXISTS public.security_deposit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.security_deposits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('received', 'held', 'applied', 'refunded', 'adjustment', 'note')
  ),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposit_events_deposit
  ON public.security_deposit_events(deposit_id, occurred_on);

ALTER TABLE public.security_deposit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deposit_events_admin ON public.security_deposit_events;
CREATE POLICY deposit_events_admin ON public.security_deposit_events FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS deposit_events_owner_select ON public.security_deposit_events;
CREATE POLICY deposit_events_owner_select ON public.security_deposit_events FOR SELECT TO authenticated
  USING (
    deposit_id IN (
      SELECT d.id FROM public.security_deposits d
      WHERE d.property_id IN (SELECT private.property_ids_for_owner())
    )
  );

DROP POLICY IF EXISTS deposit_events_tenant_select ON public.security_deposit_events;
CREATE POLICY deposit_events_tenant_select ON public.security_deposit_events FOR SELECT TO authenticated
  USING (
    deposit_id IN (
      SELECT d.id FROM public.security_deposits d
      WHERE d.tenant_id IN (SELECT private.tenant_ids_for_user())
    )
  );

DROP POLICY IF EXISTS deposit_events_accounting_select ON public.security_deposit_events;
CREATE POLICY deposit_events_accounting_select ON public.security_deposit_events FOR SELECT TO authenticated
  USING (private.is_accounting());

-- Seed received events for existing deposits (INSERT only)
INSERT INTO public.security_deposit_events (
  deposit_id, event_type, amount, description, occurred_on
)
SELECT
  d.id,
  'received',
  d.amount,
  'Security deposit received / held',
  COALESCE(d.received_date, CURRENT_DATE)
FROM public.security_deposits d
WHERE NOT EXISTS (
  SELECT 1 FROM public.security_deposit_events e
  WHERE e.deposit_id = d.id AND e.event_type = 'received'
);

-- 3) Staff specialty pick: fallback Jordan Blake
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
  v_jordan UUID := '50000000-0000-0000-0000-000000000008';
BEGIN
  IF v_norm IS NOT NULL THEN
    SELECT array_agg(v.id ORDER BY v.contact_name, v.id)
    INTO v_ids
    FROM public.vendors v
    WHERE v.active = true
      AND v.worker_type = 'staff'
      AND private.normalize_specialty(v.specialty) = v_norm;

    IF v_ids IS NOT NULL AND cardinality(v_ids) > 0 THEN
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
    END IF;
  END IF;

  -- Specialty missing/unmatched → Jordan Blake (general maintenance staff)
  IF EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = v_jordan AND active AND worker_type = 'staff'
  ) THEN
    RETURN v_jordan;
  END IF;

  RETURN NULL;
END;
$$;

-- 4) Historical: mark company-paid when WO was not owner-approval path
UPDATE public.cost_entries c
SET
  paid_by = 'company',
  billed_on_statement = false
FROM public.work_orders w
WHERE c.work_order_id = w.id
  AND COALESCE(w.requires_owner_approval, false) = false
  AND c.paid_by IS DISTINCT FROM 'company';

-- Also: completed WOs assigned to staff with no owner approval
UPDATE public.cost_entries c
SET
  paid_by = 'company',
  billed_on_statement = false
FROM public.work_orders w
JOIN public.vendors v ON v.id = w.vendor_id
WHERE c.work_order_id = w.id
  AND v.worker_type = 'staff'
  AND COALESCE(w.requires_owner_approval, false) = false
  AND c.paid_by IS DISTINCT FROM 'company';

-- Remove expense statement lines that referenced company-reclassified costs
DELETE FROM public.owner_statement_lines osl
WHERE osl.line_type = 'expense'
  AND osl.reference_id IN (
    SELECT c.id FROM public.cost_entries c WHERE c.paid_by = 'company'
  );

-- Recalc statement expense totals + remittance from remaining lines
UPDATE public.owner_statements os
SET
  total_expenses = COALESCE((
    SELECT SUM(amount) FROM public.owner_statement_lines
    WHERE statement_id = os.id AND line_type = 'expense'
  ), 0),
  remittance_due = GREATEST(
    0,
    COALESCE(os.total_collections, 0)
      - COALESCE((
          SELECT SUM(amount) FROM public.owner_statement_lines
          WHERE statement_id = os.id AND line_type = 'expense'
        ), 0)
      - COALESCE((
          SELECT SUM(amount) FROM public.owner_statement_lines
          WHERE statement_id = os.id AND line_type IN (
            'management_fee', 'leasing_commission', 'project_fee',
            'renewal_fee', 'late_fee_retained'
          )
        ), 0)
  );

-- Sync remittance line amounts to header
UPDATE public.owner_statement_lines osl
SET amount = os.remittance_due
FROM public.owner_statements os
WHERE osl.statement_id = os.id
  AND osl.line_type = 'remittance';

-- 5) Open/in-progress below-threshold WOs: move Victor → Jordan when not owner path
UPDATE public.work_orders w
SET vendor_id = '50000000-0000-0000-0000-000000000008'
WHERE COALESCE(w.requires_owner_approval, false) = false
  AND w.completed_at IS NULL
  AND w.status IN ('open', 'assigned', 'in_progress')
  AND w.vendor_id = '50000000-0000-0000-0000-000000000001'
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = '50000000-0000-0000-0000-000000000008'
      AND v.worker_type = 'staff'
  );

-- Approved (post-owner) unassigned → Victor for contractor path
UPDATE public.work_orders w
SET
  vendor_id = '50000000-0000-0000-0000-000000000001',
  status = 'assigned'
WHERE w.status = 'approved'
  AND w.vendor_id IS NULL
  AND w.completed_at IS NULL
  AND COALESCE(w.requires_owner_approval, false) = true;
