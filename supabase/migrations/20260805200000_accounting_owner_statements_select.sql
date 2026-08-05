-- Accounting needs read access to owner statements for fee-component reporting.
-- Lines remain gated by statement_lines_select (statement_id IN visible statements).

DROP POLICY IF EXISTS statements_accounting_select ON public.owner_statements;
CREATE POLICY statements_accounting_select ON public.owner_statements
  FOR SELECT TO authenticated
  USING (private.is_accounting());
