-- Spread consolidated GL fee recognition across statement months.
-- Source of truth: sum(owner_statements.management_fee) per period_end month
-- (same agency fee total as Statements UI / invoices window Sep 2025–Aug 2026).
-- Zeros ENR-JE-1 (e400…001) and inserts HL-FEE-YYYY-MM journals (e411…001–012).

-- 1) Clear the July lump on ENR-JE-1 (keep row for history / prior migrations).
UPDATE public.journal_lines jl
SET debit = 0, credit = 0
FROM public.gl_accounts ga
WHERE jl.journal_entry_id = 'e4000000-0000-0000-0000-000000000001'
  AND ga.id = jl.gl_account_id
  AND ga.code IN ('2000', '4000');

UPDATE public.journal_entries
SET memo = 'Superseded: agency fee recognition spread to monthly HL-FEE-YYYY-MM journals'
WHERE id = 'e4000000-0000-0000-0000-000000000001';

-- 2) Monthly fee totals from existing statements (idempotent upsert of headers).
WITH monthly AS (
  SELECT
    (date_trunc('month', period_end) + interval '1 month' - interval '1 day')::date AS month_end,
    EXTRACT(YEAR FROM period_end)::int AS y,
    EXTRACT(MONTH FROM period_end)::int AS m,
    ROUND(SUM(management_fee)::numeric, 2) AS fee_total,
    ROW_NUMBER() OVER (ORDER BY date_trunc('month', period_end)) AS n
  FROM public.owner_statements
  WHERE period_end >= DATE '2025-09-01'
    AND period_end < DATE '2026-09-01'
  GROUP BY date_trunc('month', period_end),
           EXTRACT(YEAR FROM period_end),
           EXTRACT(MONTH FROM period_end)
)
INSERT INTO public.journal_entries (
  id,
  entry_number,
  entry_date,
  memo,
  source_type,
  source_id,
  period_id,
  created_by
)
SELECT
  format('e4110000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid,
  format('HL-FEE-%s-%s', y, lpad(m::text, 2, '0')),
  month_end,
  format(
    'Recognize agency fees for %s (owner statement management_fee totals)',
    to_char(month_end, 'FMMonth YYYY')
  ),
  'owner_statement',
  NULL,
  (
    SELECT ap.id
    FROM public.accounting_periods ap
    WHERE ap.year = monthly.y AND ap.month = monthly.m
  ),
  'a1111111-1111-1111-1111-111111111111'
FROM monthly
ON CONFLICT (id) DO UPDATE SET
  entry_number = EXCLUDED.entry_number,
  entry_date = EXCLUDED.entry_date,
  memo = EXCLUDED.memo,
  period_id = EXCLUDED.period_id,
  source_type = EXCLUDED.source_type;

-- 3) Replace lines on the monthly journals (safe re-run).
DELETE FROM public.journal_lines
WHERE journal_entry_id >= 'e4110000-0000-0000-0000-000000000001'
  AND journal_entry_id <= 'e4110000-0000-0000-0000-000000000012';

WITH monthly AS (
  SELECT
    (date_trunc('month', period_end) + interval '1 month' - interval '1 day')::date AS month_end,
    EXTRACT(YEAR FROM period_end)::int AS y,
    EXTRACT(MONTH FROM period_end)::int AS m,
    ROUND(SUM(management_fee)::numeric, 2) AS fee_total,
    ROW_NUMBER() OVER (ORDER BY date_trunc('month', period_end)) AS n
  FROM public.owner_statements
  WHERE period_end >= DATE '2025-09-01'
    AND period_end < DATE '2026-09-01'
  GROUP BY date_trunc('month', period_end),
           EXTRACT(YEAR FROM period_end),
           EXTRACT(MONTH FROM period_end)
),
accts AS (
  SELECT
    (SELECT id FROM public.gl_accounts WHERE code = '2000') AS due_to_owner_id,
    (SELECT id FROM public.gl_accounts WHERE code = '4000') AS fee_revenue_id
)
INSERT INTO public.journal_lines (
  journal_entry_id,
  gl_account_id,
  debit,
  credit,
  property_id,
  owner_id
)
SELECT
  format('e4110000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid,
  a.due_to_owner_id,
  m.fee_total,
  0,
  NULL::uuid,
  NULL::uuid
FROM monthly m
CROSS JOIN accts a
UNION ALL
SELECT
  format('e4110000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid,
  a.fee_revenue_id,
  0,
  m.fee_total,
  NULL::uuid,
  NULL::uuid
FROM monthly m
CROSS JOIN accts a;
