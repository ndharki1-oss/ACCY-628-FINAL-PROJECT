-- Reverse 20260807010000_fix_statement_expense_remittance_signs.sql
-- Restores the signed-sum header behavior from the WO payer migration
-- (total_expenses = SUM(amount), remittance without ABS). Demo only.

UPDATE public.owner_statements os
SET
  total_expenses = COALESCE((
    SELECT SUM(amount)
    FROM public.owner_statement_lines
    WHERE statement_id = os.id AND line_type = 'expense'
  ), 0),
  remittance_due = GREATEST(
    0,
    COALESCE(os.total_collections, 0)
      - COALESCE((
          SELECT SUM(amount)
          FROM public.owner_statement_lines
          WHERE statement_id = os.id AND line_type = 'expense'
        ), 0)
      - COALESCE((
          SELECT SUM(amount)
          FROM public.owner_statement_lines
          WHERE statement_id = os.id
            AND line_type IN (
              'management_fee',
              'leasing_commission',
              'project_fee',
              'renewal_fee',
              'late_fee_retained'
            )
        ), 0)
  );

UPDATE public.owner_statement_lines osl
SET amount = os.remittance_due
FROM public.owner_statements os
WHERE osl.statement_id = os.id
  AND osl.line_type = 'remittance';
