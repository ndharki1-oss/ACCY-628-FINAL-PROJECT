-- Align base management fees to tenant credit ratings (4–12% of collections).
-- Updates existing owner statement fee/remittance rows and existing fee journal lines.
-- Does not change payments, invoices, leases, cost_entries, or company_expenses.

-- 1) Credit-based base management fee per statement from collection lines → invoice → tenant
WITH collection_fees AS (
  SELECT
    osl.statement_id,
    ROUND(
      SUM(
        osl.amount * public.management_fee_percent(t.credit_rating) / 100.0
      ),
      2
    ) AS new_base_fee,
    ROUND(
      AVG(public.management_fee_percent(t.credit_rating)),
      3
    ) AS avg_pct
  FROM public.owner_statement_lines osl
  JOIN public.invoices i ON i.id = osl.reference_id
  JOIN public.tenants t ON t.id = i.tenant_id
  WHERE osl.line_type = 'collections'
  GROUP BY osl.statement_id
)
UPDATE public.owner_statement_lines osl
SET
  amount = -cf.new_base_fee,
  description = format(
    'Base management fee %s%% of collections (tenant credit-based)',
    trim(to_char(cf.avg_pct, 'FM999990.999'))
  )
FROM collection_fees cf
WHERE osl.statement_id = cf.statement_id
  AND osl.line_type = 'management_fee';

-- 2) Header management_fee = sum of agency fee line types; remittance_due recalculated
WITH fee_totals AS (
  SELECT
    statement_id,
    ROUND(SUM(ABS(amount)), 2) AS fee_total
  FROM public.owner_statement_lines
  WHERE line_type IN (
    'management_fee',
    'leasing_commission',
    'project_fee',
    'renewal_fee',
    'late_fee_retained'
  )
  GROUP BY statement_id
)
UPDATE public.owner_statements os
SET
  management_fee = ft.fee_total,
  remittance_due = ROUND(os.total_collections - os.total_expenses - ft.fee_total, 2)
FROM fee_totals ft
WHERE os.id = ft.statement_id;

-- 3) Remittance statement lines match header remittance_due
UPDATE public.owner_statement_lines osl
SET amount = os.remittance_due
FROM public.owner_statements os
WHERE osl.statement_id = os.id
  AND osl.line_type = 'remittance';

-- 4) Sync existing GL fee recognition journals to total base management fees (UPDATEs only).
-- Put full credit-based base fee total on ENR-JE-1; zero the other two fee JEs so GL 4000 matches statements.
WITH base_fee_total AS (
  SELECT COALESCE(ROUND(SUM(ABS(amount)), 2), 0) AS total
  FROM public.owner_statement_lines
  WHERE line_type = 'management_fee'
)
UPDATE public.journal_lines jl
SET
  debit = CASE WHEN ga.code = '2000' THEN bft.total ELSE 0 END,
  credit = CASE WHEN ga.code = '4000' THEN bft.total ELSE 0 END
FROM public.journal_entries je,
     public.gl_accounts ga,
     base_fee_total bft
WHERE jl.journal_entry_id = je.id
  AND ga.id = jl.gl_account_id
  AND je.id = 'e4000000-0000-0000-0000-000000000001'
  AND ga.code IN ('2000', '4000');

UPDATE public.journal_lines jl
SET debit = 0, credit = 0
FROM public.journal_entries je,
     public.gl_accounts ga
WHERE jl.journal_entry_id = je.id
  AND ga.id = jl.gl_account_id
  AND je.id IN (
    'e4000000-0000-0000-0000-000000000003',
    'e4000000-0000-0000-0000-000000000005'
  )
  AND ga.code IN ('2000', '4000');

UPDATE public.journal_entries
SET memo = 'Recognize management fee on collections (tenant credit-based % of collected rent)'
WHERE id = 'e4000000-0000-0000-0000-000000000001';

UPDATE public.journal_entries
SET memo = 'Management fee recognition consolidated into ENR-JE-1 (credit-based)'
WHERE id IN (
  'e4000000-0000-0000-0000-000000000003',
  'e4000000-0000-0000-0000-000000000005'
);
