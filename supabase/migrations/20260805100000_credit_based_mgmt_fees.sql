-- Credit-based management fee % of collected rent (4–12%)

CREATE TYPE public.credit_rating AS ENUM ('AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC');

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS credit_rating public.credit_rating NOT NULL DEFAULT 'BBB';

CREATE OR REPLACE FUNCTION public.management_fee_percent(p_rating public.credit_rating)
RETURNS NUMERIC(6,3)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_rating
    WHEN 'AAA' THEN 4.0
    WHEN 'AA'  THEN 5.0
    WHEN 'A'   THEN 6.0
    WHEN 'BBB' THEN 7.5
    WHEN 'BB'  THEN 9.0
    WHEN 'B'   THEN 10.5
    WHEN 'CCC' THEN 12.0
  END::NUMERIC(6,3);
$$;

GRANT EXECUTE ON FUNCTION public.management_fee_percent(public.credit_rating) TO authenticated;

-- Assign varied credit ratings across tenants (stable by company_name order)
WITH ranked AS (
  SELECT
    id,
    (ARRAY[
      'AAA'::public.credit_rating,
      'AA'::public.credit_rating,
      'A'::public.credit_rating,
      'BBB'::public.credit_rating,
      'BB'::public.credit_rating,
      'B'::public.credit_rating,
      'CCC'::public.credit_rating,
      'AA'::public.credit_rating,
      'A'::public.credit_rating,
      'BBB'::public.credit_rating,
      'BB'::public.credit_rating,
      'B'::public.credit_rating,
      'A'::public.credit_rating,
      'CCC'::public.credit_rating,
      'BBB'::public.credit_rating
    ])[((ROW_NUMBER() OVER (ORDER BY company_name) - 1) % 15) + 1] AS rating
  FROM public.tenants
)
UPDATE public.tenants t
SET credit_rating = ranked.rating
FROM ranked
WHERE t.id = ranked.id;

-- Tighten management agreement fee band to 4–12%
ALTER TABLE public.management_agreements
  DROP CONSTRAINT IF EXISTS management_agreements_fee_percent_check;

ALTER TABLE public.management_agreements
  ADD CONSTRAINT management_agreements_fee_percent_check
  CHECK (fee_percent >= 4 AND fee_percent <= 12);

-- Property-level fallback = avg of active-lease tenant fees on that property (else 7.5)
UPDATE public.management_agreements ma
SET fee_percent = COALESCE(sub.avg_fee, 7.5)
FROM (
  SELECT
    p.id AS property_id,
    ROUND(AVG(public.management_fee_percent(t.credit_rating)), 3) AS avg_fee
  FROM public.properties p
  LEFT JOIN public.leases l
    ON l.property_id = p.id
   AND l.status IN ('active', 'renewal_pending')
  LEFT JOIN public.tenants t ON t.id = l.tenant_id
  GROUP BY p.id
) sub
WHERE ma.property_id = sub.property_id;

-- View: lease manager pricing derived from tenant credit
CREATE OR REPLACE VIEW public.lease_management_pricing
WITH (security_invoker = true) AS
SELECT
  l.id AS lease_id,
  l.lease_number,
  l.tenant_id,
  t.company_name AS tenant_name,
  t.credit_rating,
  public.management_fee_percent(t.credit_rating) AS management_fee_percent,
  l.lease_type,
  l.property_id
FROM public.leases l
JOIN public.tenants t ON t.id = l.tenant_id;

GRANT SELECT ON public.lease_management_pricing TO authenticated;
