-- Reverse monthly HL-FEE journals; restore consolidated ENR-JE-1 to prior base-fee lump.

DELETE FROM public.journal_entries
WHERE id >= 'e4110000-0000-0000-0000-000000000001'
  AND id <= 'e4110000-0000-0000-0000-000000000012';

WITH base_fee_total AS (
  SELECT COALESCE(ROUND(SUM(ABS(amount))::numeric, 2), 0) AS total
  FROM public.owner_statement_lines
  WHERE line_type = 'management_fee'
)
UPDATE public.journal_lines jl
SET
  debit = CASE WHEN ga.code = '2000' THEN bft.total ELSE 0 END,
  credit = CASE WHEN ga.code = '4000' THEN bft.total ELSE 0 END
FROM public.gl_accounts ga,
     base_fee_total bft
WHERE jl.journal_entry_id = 'e4000000-0000-0000-0000-000000000001'
  AND ga.id = jl.gl_account_id
  AND ga.code IN ('2000', '4000');

UPDATE public.journal_entries
SET memo = 'Recognize management fee on collections (tenant credit + property risk % of collected rent)',
    entry_date = DATE '2026-07-31',
    period_id = (
      SELECT id FROM public.accounting_periods WHERE year = 2026 AND month = 7
    )
WHERE id = 'e4000000-0000-0000-0000-000000000001';
