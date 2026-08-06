-- Additive only: classify workers + Harborline maintenance staff for employee portal.
-- Does not rewrite prior seed migrations. Keeps Victor Chen login and vendor id.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS worker_type TEXT
  CHECK (worker_type IS NULL OR worker_type IN ('staff', 'contractor'));

COMMENT ON COLUMN public.vendors.worker_type IS
  'staff = Harborline maintenance employees; contractor = retained independent contractors (e.g. Chen Building Services). NULL = other external vendors.';

-- Victor Chen / Chen Building Services — contractor (do not change id, profile, or email).
UPDATE public.vendors
SET worker_type = 'contractor'
WHERE id = '50000000-0000-0000-0000-000000000001'
  AND (worker_type IS DISTINCT FROM 'contractor');

CREATE OR REPLACE FUNCTION private.is_vendor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'vendor'
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_vendor() TO authenticated;

-- Employee portal: staff may read Harborline staff directory + contractor contact cards.
DROP POLICY IF EXISTS vendors_vendor_directory_select ON public.vendors;
CREATE POLICY vendors_vendor_directory_select ON public.vendors
  FOR SELECT TO authenticated
  USING (
    private.is_vendor()
    AND worker_type IN ('staff', 'contractor')
  );

-- Five Harborline maintenance staff (directory only — no auth logins).
INSERT INTO public.vendors (
  id, profile_id, company_name, contact_name, email, phone, specialty, active, worker_type
) VALUES
  (
    '50000000-0000-0000-0000-000000000007',
    NULL,
    'Harborline Commercial Management',
    'Sam Ortega',
    'sam.ortega@harborline.demo',
    '312-555-4101',
    'pest control',
    true,
    'staff'
  ),
  (
    '50000000-0000-0000-0000-000000000008',
    NULL,
    'Harborline Commercial Management',
    'Jordan Blake',
    'jordan.blake@harborline.demo',
    '312-555-4102',
    'general maintenance',
    true,
    'staff'
  ),
  (
    '50000000-0000-0000-0000-000000000009',
    NULL,
    'Harborline Commercial Management',
    'Casey Nguyen',
    'casey.nguyen@harborline.demo',
    '312-555-4103',
    'HVAC',
    true,
    'staff'
  ),
  (
    '50000000-0000-0000-0000-000000000010',
    NULL,
    'Harborline Commercial Management',
    'Riley Soto',
    'riley.soto@harborline.demo',
    '312-555-4104',
    'electrical',
    true,
    'staff'
  ),
  (
    '50000000-0000-0000-0000-000000000011',
    NULL,
    'Harborline Commercial Management',
    'Avery Quinn',
    'avery.quinn@harborline.demo',
    '312-555-4105',
    'plumbing',
    true,
    'staff'
  )
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  contact_name = EXCLUDED.contact_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  specialty = EXCLUDED.specialty,
  active = EXCLUDED.active,
  worker_type = EXCLUDED.worker_type;
