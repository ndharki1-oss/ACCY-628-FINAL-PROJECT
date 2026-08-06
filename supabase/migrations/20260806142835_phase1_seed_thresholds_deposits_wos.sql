-- Phase 1 seed: rent-based approval thresholds, property types,
-- security deposits, message copy fix, pending demo work orders.

-- 1) Approval threshold = 10% of active monthly base rent (stored as dollars)
WITH rent AS (
  SELECT property_id, COALESCE(SUM(base_rent_monthly), 0) AS monthly_rent
  FROM public.leases
  WHERE status = 'active'
  GROUP BY property_id
)
UPDATE public.management_agreements ma
SET
  approval_threshold = ROUND((COALESCE(r.monthly_rent, 0) * 0.10)::numeric, 2),
  notes = CASE
    WHEN ma.notes ILIKE '%10% of current monthly base rent%' THEN ma.notes
    WHEN ma.notes IS NULL OR btrim(ma.notes) = '' THEN
      'Approval threshold = 10% of current monthly base rent (active leases).'
    ELSE
      ma.notes
      || E'\nApproval threshold = 10% of current monthly base rent (active leases).'
  END
FROM rent r
WHERE r.property_id = ma.property_id
  AND ma.status = 'active';

-- Properties with no active leases: keep a modest floor
UPDATE public.management_agreements ma
SET
  approval_threshold = 500,
  notes = CASE
    WHEN ma.notes ILIKE '%10% of current monthly base rent%' THEN ma.notes
    WHEN ma.notes IS NULL OR btrim(ma.notes) = '' THEN
      'Approval threshold = 10% of current monthly base rent (active leases); $500 floor when vacant.'
    ELSE
      ma.notes
      || E'\nApproval threshold = 10% of current monthly base rent (active leases); $500 floor when vacant.'
  END
WHERE ma.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.property_id = ma.property_id AND l.status = 'active'
  );

-- 2) Align property_type to property names
UPDATE public.properties
SET property_type = CASE
  WHEN name ~* '(industrial|warehouse|yard|works)' THEN 'industrial'
  WHEN name ~* '(shops|retail|market|arcade|gallery|exchange|flex)' THEN 'retail'
  ELSE 'office'
END;

-- 3) Security deposits: held rows for active leases missing a deposit
INSERT INTO public.security_deposits (
  lease_id, tenant_id, property_id, amount, status, received_date, notes
)
SELECT
  l.id,
  l.tenant_id,
  l.property_id,
  l.security_deposit_required,
  'held'::public.deposit_status,
  GREATEST(l.start_date, DATE '2025-09-01'),
  'Phase 1 seed — held deposit aligned to lease requirement'
FROM public.leases l
WHERE l.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.security_deposits d WHERE d.lease_id = l.id
  );

-- Align amounts on existing held deposits to lease requirement
UPDATE public.security_deposits d
SET amount = l.security_deposit_required
FROM public.leases l
WHERE d.lease_id = l.id
  AND l.status = 'active'
  AND d.status = 'held'
  AND d.amount IS DISTINCT FROM l.security_deposit_required;

-- 4) Fix owner message that names the wrong building (Bennett ≠ Harbor Point, not South Loop)
UPDATE public.tenant_manager_messages
SET body = 'From the ownership side, we appreciate your tenancy at Harbor Point Center. Happy to discuss renewal options when you are ready.'
WHERE id = '65354db0-dae8-48e8-ab07-e277a64eb6a2'
  AND body ILIKE '%South Loop%';

-- 5) Current-month pending / attention work orders (Bennett demo properties)
INSERT INTO public.work_orders (
  id,
  property_id,
  unit_id,
  lease_id,
  vendor_id,
  wo_number,
  wo_type,
  status,
  title,
  description,
  scheduled_date,
  estimated_cost,
  actual_cost,
  requires_owner_approval,
  created_at
)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    '20000000-0000-0000-0000-000000000001', -- Harbor Point Center
    '30000000-0000-0000-0001-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'PHASE1-WO-001',
    'tenant',
    'pending_owner_approval',
    'Emergency rooftop HVAC failure — Suite 110',
    'Compressor failure after after-hours call. Temporary cooling in place. Owner approval required before full replacement.',
    DATE '2026-08-06',
    4200,
    0,
    true,
    TIMESTAMPTZ '2026-08-06 15:00:00+00'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '20000000-0000-0000-0000-000000000016', -- Michigan Avenue Suites
    '30000000-0000-0000-0016-000000000001',
    '60000000-0000-0000-0000-000000000016',
    '50000000-0000-0000-0000-000000000004',
    'PHASE1-WO-002',
    'capex',
    'pending_owner_approval',
    'Major roof membrane patch above Suite 110',
    'Leak after recent storms. Estimate exceeds property approval threshold; awaiting owner decision.',
    DATE '2026-08-05',
    2800,
    0,
    true,
    TIMESTAMPTZ '2026-08-05 18:00:00+00'
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    '20000000-0000-0000-0000-000000000001', -- Harbor Point Center
    '30000000-0000-0000-0001-000000000002',
    '60000000-0000-0000-0000-000000000023',
    '50000000-0000-0000-0000-000000000002',
    'PHASE1-WO-003',
    'preventive',
    'assigned',
    'Suite 120 thermostat calibration',
    'Routine HVAC calibration scheduled with Lakeside HVAC.',
    DATE '2026-08-07',
    350,
    0,
    false,
    TIMESTAMPTZ '2026-08-06 16:00:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  estimated_cost = EXCLUDED.estimated_cost,
  requires_owner_approval = EXCLUDED.requires_owner_approval,
  scheduled_date = EXCLUDED.scheduled_date;
