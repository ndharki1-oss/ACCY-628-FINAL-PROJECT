-- Reverse additive historical OpEx / labor backfill only (fixed UUID namespaces).

DELETE FROM public.cost_entries
WHERE id >= 'b0e30000-0000-4000-8000-000000000000'::uuid
  AND id < 'b0e40000-0000-4000-8000-000000000000'::uuid;

DELETE FROM public.labor_time_entries
WHERE id >= 'b0e20000-0000-4000-8000-000000000000'::uuid
  AND id < 'b0e30000-0000-4000-8000-000000000000'::uuid;

DELETE FROM public.company_expenses
WHERE id >= 'b0e10000-0000-4000-8000-000000000000'::uuid
  AND id < 'b0e20000-0000-4000-8000-000000000000'::uuid;
