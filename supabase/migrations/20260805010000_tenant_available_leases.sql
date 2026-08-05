-- Tenant browse: active properties in the Harborline network
CREATE POLICY properties_tenant_browse_active ON public.properties
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND private.current_role() = 'tenant'
  );

-- Vacant units visible without exposing other tenants' lease rows
CREATE OR REPLACE VIEW public.available_rental_listings
WITH (security_invoker = false) AS
SELECT
  u.id AS unit_id,
  u.unit_code,
  u.floor,
  u.square_feet,
  p.id AS property_id,
  p.name AS property_name,
  p.address_line1,
  p.city,
  p.state,
  p.postal_code,
  p.property_type
FROM public.units u
JOIN public.properties p ON p.id = u.property_id
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.leases l
    WHERE l.unit_id = u.id
      AND l.status IN ('active', 'renewal_pending')
  );

GRANT SELECT ON public.available_rental_listings TO authenticated;

-- Demo vacant units on the first five active properties
INSERT INTO public.units (id, property_id, unit_code, floor, square_feet)
SELECT
  format('30000000-ffff-0000-0000-%s', lpad(n::text, 12, '0'))::uuid,
  p.id,
  format('Suite %s', 400 + n),
  '2',
  2100 + n * 125
FROM (
  SELECT id, row_number() OVER (ORDER BY name) AS n
  FROM public.properties
  WHERE status = 'active'
) p
WHERE p.n <= 5
ON CONFLICT (id) DO NOTHING;
