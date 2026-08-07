-- Repair owner statement headers after WO payer migration summed signed
-- expense/fee lines without ABS, which:
--   1) stored total_expenses as negative (seed intended positive magnitudes)
--   2) inflated remittance_due via collections - (negative expenses) - (negative fees)
--
-- Lines stay signed (collections +, expense/fee −, remittance +).
-- Headers: total_expenses and management_fee positive; remittance_due = collections − expenses − fees.

UPDATE public.owner_statements os
SET
  total_expenses = COALESCE((
    SELECT ROUND(SUM(ABS(amount)), 2)
    FROM public.owner_statement_lines
    WHERE statement_id = os.id AND line_type = 'expense'
  ), 0),
  management_fee = COALESCE((
    SELECT ROUND(SUM(ABS(amount)), 2)
    FROM public.owner_statement_lines
    WHERE statement_id = os.id
      AND line_type IN (
        'management_fee',
        'leasing_commission',
        'project_fee',
        'renewal_fee',
        'late_fee_retained'
      )
  ), 0),
  remittance_due = ROUND(
    COALESCE(os.total_collections, 0)
      - COALESCE((
          SELECT ROUND(SUM(ABS(amount)), 2)
          FROM public.owner_statement_lines
          WHERE statement_id = os.id AND line_type = 'expense'
        ), 0)
      - COALESCE((
          SELECT ROUND(SUM(ABS(amount)), 2)
          FROM public.owner_statement_lines
          WHERE statement_id = os.id
            AND line_type IN (
              'management_fee',
              'leasing_commission',
              'project_fee',
              'renewal_fee',
              'late_fee_retained'
            )
        ), 0),
    2
  );

UPDATE public.owner_statement_lines osl
SET amount = os.remittance_due
FROM public.owner_statements os
WHERE osl.statement_id = os.id
  AND osl.line_type = 'remittance';
