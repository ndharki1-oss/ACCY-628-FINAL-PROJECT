-- Sync labor_time_entries to current WO assignees (Jordan staff vs Victor contractor).
-- Additive / UPDATE only — no deletes.

-- 1) Move labor rows onto the profile of the vendor currently assigned to that WO
UPDATE public.labor_time_entries l
SET profile_id = v.profile_id
FROM public.work_orders w
JOIN public.vendors v ON v.id = w.vendor_id
WHERE l.work_order_id = w.id
  AND v.profile_id IS NOT NULL
  AND l.profile_id IS DISTINCT FROM v.profile_id;

-- 2) Staff (Jordan) labor for in-house completed WOs that still lack a labor row
INSERT INTO public.labor_time_entries (
  profile_id, property_id, work_order_id, work_date, hours, hourly_rate, notes
)
SELECT
  'f6666666-6666-6666-6666-666666666666'::uuid,
  w.property_id,
  w.id,
  COALESCE(w.completed_at::date, CURRENT_DATE),
  GREATEST(
    1.0,
    ROUND(
      COALESCE(NULLIF(w.actual_cost, 0), NULLIF(w.estimated_cost, 0), 220) / 55.0,
      2
    )
  ),
  55.00,
  COALESCE(w.title, 'In-house maintenance labor')
FROM public.work_orders w
WHERE w.vendor_id = '50000000-0000-0000-0000-000000000008'
  AND w.completed_at IS NOT NULL
  AND COALESCE(w.requires_owner_approval, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.labor_time_entries l WHERE l.work_order_id = w.id
  );

-- 3) Contractor (Victor) labor for escalated/owner-paid completed WOs lacking labor
INSERT INTO public.labor_time_entries (
  profile_id, property_id, work_order_id, work_date, hours, hourly_rate, notes
)
SELECT
  'd4444444-4444-4444-4444-444444444444'::uuid,
  w.property_id,
  w.id,
  COALESCE(w.completed_at::date, CURRENT_DATE),
  GREATEST(
    1.0,
    ROUND(
      COALESCE(NULLIF(w.actual_cost, 0), NULLIF(w.estimated_cost, 0), 750) / 75.0,
      2
    )
  ),
  75.00,
  COALESCE(w.title, 'Contractor labor')
FROM public.work_orders w
WHERE w.vendor_id = '50000000-0000-0000-0000-000000000001'
  AND w.completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.labor_time_entries l WHERE l.work_order_id = w.id
  );

-- 4) Unlinked site-walk labor stays with Victor (contractor estimate work) — no change
