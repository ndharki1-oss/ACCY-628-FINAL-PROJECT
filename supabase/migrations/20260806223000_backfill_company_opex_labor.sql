-- Additive historical Harborline OpEx / labor backfill for demo window
-- Sep 2025–Aug 2026. Does NOT update or delete existing seed rows.
--
-- company_expenses: Sep 2025–Jun 2026 + Aug 2026 (skip Jul 2026 — already seeded)
-- labor_time_entries: Sep 2025–Jun 2026 (skip Jul/Aug 2026 — already seeded)
-- company-paid cost_entries: Sep 2025–Aug 2026 (light; new rows only)

-- ---------------------------------------------------------------------------
-- 1) Recurring company_expenses (payroll / software / marketing / insurance)
--    Totals ~$14.5k–$17k per month (±~10% of July ~$15.9k baseline).
-- ---------------------------------------------------------------------------
INSERT INTO public.company_expenses (id, category, description, amount, incurred_date)
SELECT
  (
    'b0e10000-0000-4000-8000-'
    || to_char(m.month_start, 'YYYYMM')
    || lpad(l.line_n::text, 6, '0')
  )::uuid,
  l.category,
  l.description,
  round(l.base_amount * m.factor, 2),
  (m.month_start + (l.day_offset - 1))::date
FROM (
  SELECT
    d::date AS month_start,
    -- Deterministic ±~10% variation by month (no outliers)
    1
    + (
      (
        (EXTRACT(MONTH FROM d)::int * 3 + EXTRACT(YEAR FROM d)::int) % 9
      )
      - 4
    )
    * 0.025 AS factor
  FROM generate_series(DATE '2025-09-01', DATE '2026-08-01', INTERVAL '1 month') AS d
) m
CROSS JOIN (
  VALUES
    (1, 'software'::text, 'Portfolio platform subscription'::text, 1200.00::numeric, 1),
    (2, 'software', 'Property management tools add-on', 890.00, 1),
    (3, 'marketing', 'Leasing campaign creative', 1800.00, 10),
    (4, 'insurance', 'Professional liability coverage', 2400.00, 15),
    (5, 'payroll', 'Regional property team allocation', 9600.00, 28)
) AS l(line_n, category, description, base_amount, day_offset)
WHERE to_char(m.month_start, 'YYYY-MM') <> '2026-07'
  -- Cap day_offset within month (Feb etc.)
  AND (m.month_start + (l.day_offset - 1))
    < (m.month_start + INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Labor time entries (Jordan staff + Victor contractor), no WO link
-- ---------------------------------------------------------------------------
INSERT INTO public.labor_time_entries (
  id, profile_id, property_id, work_order_id, work_date, hours, hourly_rate, notes
)
SELECT
  (
    'b0e20000-0000-4000-8000-'
    || to_char(m.month_start, 'YYYYMM')
    || lpad(l.line_n::text, 6, '0')
  )::uuid,
  l.profile_id,
  l.property_id,
  NULL,
  (m.month_start + (l.day_offset - 1))::date,
  round(l.hours * m.factor, 2),
  l.hourly_rate,
  l.notes
FROM (
  SELECT
    d::date AS month_start,
    1
    + (
      (
        (EXTRACT(MONTH FROM d)::int * 5 + EXTRACT(YEAR FROM d)::int) % 7
      )
      - 3
    )
    * 0.03 AS factor
  FROM generate_series(DATE '2025-09-01', DATE '2026-06-01', INTERVAL '1 month') AS d
) m
CROSS JOIN (
  VALUES
    (
      1,
      'f6666666-6666-6666-6666-666666666666'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      38.00::numeric,
      55.00::numeric,
      5,
      'Preventive maintenance rounds'::text
    ),
    (
      2,
      'f6666666-6666-6666-6666-666666666666'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      32.00,
      55.00,
      12,
      'In-house punch list / unit turns'
    ),
    (
      3,
      'd4444444-4444-4444-4444-444444444444'::uuid,
      '20000000-0000-0000-0000-000000000003'::uuid,
      22.00,
      75.00,
      18,
      'Contractor specialty service'
    ),
    (
      4,
      'd4444444-4444-4444-4444-444444444444'::uuid,
      '20000000-0000-0000-0000-000000000015'::uuid,
      14.50,
      75.00,
      24,
      'Site walk / estimate (no WO)'
    )
) AS l(line_n, profile_id, property_id, hours, hourly_rate, day_offset, notes)
WHERE (m.month_start + (l.day_offset - 1))
  < (m.month_start + INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Light company-paid cost_entries (Harborline absorbs; not on owner statements)
-- ---------------------------------------------------------------------------
INSERT INTO public.cost_entries (
  id,
  property_id,
  owner_id,
  unit_id,
  lease_id,
  work_order_id,
  vendor_id,
  category,
  description,
  amount,
  incurred_date,
  owner_approved,
  owner_approved_at,
  admin_override,
  override_reason,
  billed_on_statement,
  created_by,
  paid_by
)
SELECT
  (
    'b0e30000-0000-4000-8000-'
    || to_char(m.month_start, 'YYYYMM')
    || lpad(l.line_n::text, 6, '0')
  )::uuid,
  l.property_id,
  p.owner_id,
  NULL,
  NULL,
  NULL,
  NULL,
  l.category,
  l.description,
  round(l.base_amount * m.factor, 2),
  (m.month_start + (l.day_offset - 1))::date,
  true,
  (m.month_start + (l.day_offset - 1))::timestamptz,
  false,
  NULL,
  false,
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'company'
FROM (
  SELECT
    d::date AS month_start,
    1
    + (
      (
        (EXTRACT(MONTH FROM d)::int * 2 + EXTRACT(YEAR FROM d)::int) % 5
      )
      - 2
    )
    * 0.04 AS factor
  FROM generate_series(DATE '2025-09-01', DATE '2026-08-01', INTERVAL '1 month') AS d
) m
CROSS JOIN (
  VALUES
    (
      1,
      '20000000-0000-0000-0000-000000000001'::uuid,
      'materials'::public.cost_category,
      'In-house supplies absorbed by Harborline'::text,
      520.00::numeric,
      8
    ),
    (
      2,
      '20000000-0000-0000-0000-000000000006'::uuid,
      'parts'::public.cost_category,
      'Minor parts for staff-completed work'::text,
      680.00,
      16
    ),
    (
      3,
      '20000000-0000-0000-0000-000000000010'::uuid,
      'other'::public.cost_category,
      'Company-covered misc. ops cost'::text,
      410.00,
      22
    )
) AS l(line_n, property_id, category, description, base_amount, day_offset)
JOIN public.properties p ON p.id = l.property_id
WHERE (m.month_start + (l.day_offset - 1))
  < (m.month_start + INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;
