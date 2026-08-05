-- Browse leases that are not currently active (network-wide, no tenant PII)
CREATE OR REPLACE VIEW public.available_non_active_leases
WITH (security_invoker = false) AS
SELECT
  l.id AS lease_id,
  l.lease_number,
  l.lease_type,
  l.status,
  l.start_date,
  l.end_date,
  l.base_rent_monthly,
  l.cam_monthly,
  p.id AS property_id,
  p.name AS property_name,
  p.address_line1,
  p.city,
  p.state,
  p.postal_code,
  p.property_type
FROM public.leases l
JOIN public.properties p ON p.id = l.property_id
WHERE l.status <> 'active'::public.lease_status
  AND p.status = 'active';

GRANT SELECT ON public.available_non_active_leases TO authenticated;
