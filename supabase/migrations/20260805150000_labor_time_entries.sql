-- Labor time entries for employee hours/cost reporting

CREATE TABLE IF NOT EXISTS public.labor_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC(8,2) NOT NULL CHECK (hours > 0),
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  labor_cost NUMERIC(12,2) GENERATED ALWAYS AS (round(hours * hourly_rate, 2)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_labor_profile ON public.labor_time_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_labor_property ON public.labor_time_entries(property_id);
CREATE INDEX IF NOT EXISTS idx_labor_wo ON public.labor_time_entries(work_order_id);
CREATE INDEX IF NOT EXISTS idx_labor_date ON public.labor_time_entries(work_date);

ALTER TABLE public.labor_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS labor_admin_all ON public.labor_time_entries;
CREATE POLICY labor_admin_all ON public.labor_time_entries FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS labor_accounting_select ON public.labor_time_entries;
CREATE POLICY labor_accounting_select ON public.labor_time_entries FOR SELECT TO authenticated
  USING (private.is_accounting());

DROP POLICY IF EXISTS labor_accounting_all ON public.labor_time_entries;
CREATE POLICY labor_accounting_all ON public.labor_time_entries FOR ALL TO authenticated
  USING (private.is_finance()) WITH CHECK (private.is_finance());

DROP POLICY IF EXISTS labor_employee_select ON public.labor_time_entries;
CREATE POLICY labor_employee_select ON public.labor_time_entries FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS labor_employee_insert ON public.labor_time_entries;
CREATE POLICY labor_employee_insert ON public.labor_time_entries FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Seed hours for demo employee (Victor Chen / employee@example.com)
INSERT INTO public.labor_time_entries (
  id, profile_id, property_id, work_order_id, work_date, hours, hourly_rate, notes
) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'd4444444-4444-4444-4444-444444444444', '20000000-0000-0000-0000-000000000003', '24fb2826-f217-42a1-bf2b-6439677e2c81', CURRENT_DATE - 12, 6.5, 55.00, 'HVAC inspection labor'),
  ('a1000000-0000-0000-0000-000000000002', 'd4444444-4444-4444-4444-444444444444', '20000000-0000-0000-0000-000000000004', '78c8a275-ad63-46be-bbbf-3ea4066c97eb', CURRENT_DATE - 9, 4.0, 55.00, 'Preventive maintenance'),
  ('a1000000-0000-0000-0000-000000000003', 'd4444444-4444-4444-4444-444444444444', '20000000-0000-0000-0000-000000000005', 'a975cd58-030d-4758-bf95-0703f6d4696b', CURRENT_DATE - 6, 8.0, 60.00, 'Tenant request response'),
  ('a1000000-0000-0000-0000-000000000004', 'd4444444-4444-4444-4444-444444444444', '20000000-0000-0000-0000-000000000007', 'e2000000-0000-0000-0000-000000000007', CURRENT_DATE - 3, 5.5, 60.00, 'Dock lighting upgrade labor'),
  ('a1000000-0000-0000-0000-000000000005', 'd4444444-4444-4444-4444-444444444444', '20000000-0000-0000-0000-000000000002', '4fa33087-ee85-459e-a3f9-a355fad1af70', CURRENT_DATE - 1, 3.0, 55.00, 'Follow-up punch list'),
  ('a1000000-0000-0000-0000-000000000006', 'd4444444-4444-4444-4444-444444444444', '20000000-0000-0000-0000-000000000015', NULL, CURRENT_DATE - 4, 2.5, 50.00, 'Site walk / estimate (no WO)')
ON CONFLICT (id) DO UPDATE SET
  hours = EXCLUDED.hours,
  hourly_rate = EXCLUDED.hourly_rate,
  notes = EXCLUDED.notes,
  work_date = EXCLUDED.work_date,
  property_id = EXCLUDED.property_id,
  work_order_id = EXCLUDED.work_order_id;
