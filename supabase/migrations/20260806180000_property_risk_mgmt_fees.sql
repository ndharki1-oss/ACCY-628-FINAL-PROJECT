-- Property risk uplift on management fees (credit + risk, cap 14%).
-- ADD COLUMN + UPDATEs only. Does not delete payments, invoices, leases, or costs.

CREATE TYPE public.property_risk_tier AS ENUM ('standard', 'elevated', 'high');

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS risk_tier public.property_risk_tier NOT NULL DEFAULT 'standard';

UPDATE public.properties
SET risk_tier = CASE property_type
  WHEN 'industrial' THEN 'high'::public.property_risk_tier
  WHEN 'retail' THEN 'elevated'::public.property_risk_tier
  ELSE 'standard'::public.property_risk_tier
END;

CREATE OR REPLACE FUNCTION public.property_risk_fee_uplift(
  p_tier public.property_risk_tier
)
RETURNS NUMERIC(6,3)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(p_tier, 'standard'::public.property_risk_tier)
    WHEN 'elevated' THEN 1.0
    WHEN 'high' THEN 2.0
    ELSE 0.0
  END::NUMERIC(6,3);
$$;

-- Two-arg canonical fee: credit base + risk uplift, capped at 14%.
CREATE OR REPLACE FUNCTION public.management_fee_percent(
  p_rating public.credit_rating,
  p_risk public.property_risk_tier
)
RETURNS NUMERIC(6,3)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(
    (
      CASE p_rating
        WHEN 'AAA' THEN 4.0
        WHEN 'AA'  THEN 5.0
        WHEN 'A'   THEN 6.0
        WHEN 'BBB' THEN 7.5
        WHEN 'BB'  THEN 9.0
        WHEN 'B'   THEN 10.5
        WHEN 'CCC' THEN 12.0
      END
      + public.property_risk_fee_uplift(p_risk)
    )::NUMERIC(6,3),
    14.0::NUMERIC(6,3)
  );
$$;

-- One-arg wrapper keeps credit-only call sites working (assumes standard risk).
CREATE OR REPLACE FUNCTION public.management_fee_percent(
  p_rating public.credit_rating
)
RETURNS NUMERIC(6,3)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.management_fee_percent(
    p_rating,
    'standard'::public.property_risk_tier
  );
$$;

GRANT EXECUTE ON FUNCTION public.property_risk_fee_uplift(public.property_risk_tier) TO authenticated;
GRANT EXECUTE ON FUNCTION public.management_fee_percent(public.credit_rating) TO authenticated;
GRANT EXECUTE ON FUNCTION public.management_fee_percent(public.credit_rating, public.property_risk_tier) TO authenticated;

-- Widen MA display band for averages that include risk uplift.
ALTER TABLE public.management_agreements
  DROP CONSTRAINT IF EXISTS management_agreements_fee_percent_check;

ALTER TABLE public.management_agreements
  ADD CONSTRAINT management_agreements_fee_percent_check
  CHECK (fee_percent >= 4 AND fee_percent <= 14);

-- Realign base management fees from collections using credit + property risk.
WITH collection_fees AS (
  SELECT
    osl.statement_id,
    ROUND(
      SUM(
        osl.amount
        * public.management_fee_percent(t.credit_rating, p.risk_tier)
        / 100.0
      ),
      2
    ) AS new_base_fee,
    ROUND(
      AVG(public.management_fee_percent(t.credit_rating, p.risk_tier)),
      3
    ) AS avg_pct
  FROM public.owner_statement_lines osl
  JOIN public.invoices i ON i.id = osl.reference_id
  JOIN public.tenants t ON t.id = i.tenant_id
  JOIN public.properties p ON p.id = i.property_id
  WHERE osl.line_type = 'collections'
  GROUP BY osl.statement_id
)
UPDATE public.owner_statement_lines osl
SET
  amount = -cf.new_base_fee,
  description = format(
    'Base management fee %s%% of collections (tenant credit + property risk)',
    trim(to_char(cf.avg_pct, 'FM999990.999'))
  )
FROM collection_fees cf
WHERE osl.statement_id = cf.statement_id
  AND osl.line_type = 'management_fee';

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

UPDATE public.owner_statement_lines osl
SET amount = os.remittance_due
FROM public.owner_statements os
WHERE osl.statement_id = os.id
  AND osl.line_type = 'remittance';

-- Sync consolidated fee GL (ENR-JE-1) to new base fee total.
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
SET memo = 'Recognize management fee on collections (tenant credit + property risk % of collected rent)'
WHERE id = 'e4000000-0000-0000-0000-000000000001';

UPDATE public.journal_entries
SET memo = 'Management fee recognition consolidated into ENR-JE-1 (credit + property risk)'
WHERE id IN (
  'e4000000-0000-0000-0000-000000000003',
  'e4000000-0000-0000-0000-000000000005'
);

-- MA display average = unweighted avg of active-lease fees (credit + risk).
UPDATE public.management_agreements ma
SET fee_percent = COALESCE(sub.avg_fee, 7.5)
FROM (
  SELECT
    p.id AS property_id,
    ROUND(
      AVG(public.management_fee_percent(t.credit_rating, p.risk_tier)),
      3
    ) AS avg_fee
  FROM public.properties p
  LEFT JOIN public.leases l
    ON l.property_id = p.id
   AND l.status IN ('active', 'renewal_pending')
  LEFT JOIN public.tenants t ON t.id = l.tenant_id
  GROUP BY p.id
) sub
WHERE ma.property_id = sub.property_id;

DROP VIEW IF EXISTS public.lease_management_pricing;

CREATE VIEW public.lease_management_pricing
WITH (security_invoker = true) AS
SELECT
  l.id AS lease_id,
  l.lease_number,
  l.tenant_id,
  t.company_name AS tenant_name,
  t.credit_rating,
  p.risk_tier AS property_risk_tier,
  public.management_fee_percent(t.credit_rating, p.risk_tier) AS management_fee_percent,
  l.lease_type,
  l.property_id
FROM public.leases l
JOIN public.tenants t ON t.id = l.tenant_id
JOIN public.properties p ON p.id = l.property_id;

GRANT SELECT ON public.lease_management_pricing TO authenticated;
