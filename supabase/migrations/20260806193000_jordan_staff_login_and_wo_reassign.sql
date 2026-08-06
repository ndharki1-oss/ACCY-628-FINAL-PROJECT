-- Jordan Blake staff demo login + historical WO reassignment by payer/performer rules.
-- Additive only: no seed deletes.

-- 1) Auth user + profile for Jordan (staff@example.com / demo12)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'f6666666-6666-6666-6666-666666666666',
  'authenticated',
  'authenticated',
  'staff@example.com',
  extensions.crypt('demo12', extensions.gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"],"role":"vendor"}',
  '{"sub":"f6666666-6666-6666-6666-666666666666","email":"staff@example.com","email_verified":true,"phone_verified":false,"full_name":"Jordan Blake"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'f6666666-6666-6666-6666-666666666666',
  'f6666666-6666-6666-6666-666666666666',
  '{"sub":"f6666666-6666-6666-6666-666666666666","email":"staff@example.com","email_verified":true}',
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider_id, provider) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = now();

INSERT INTO public.profiles (id, email, full_name, role, phone) VALUES (
  'f6666666-6666-6666-6666-666666666666',
  'staff@example.com',
  'Jordan Blake',
  'vendor',
  '312-555-4102'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  updated_at = now();

-- Link Jordan vendor row to the new login (keep vendor id …0008)
UPDATE public.vendors
SET
  profile_id = 'f6666666-6666-6666-6666-666666666666',
  email = 'staff@example.com',
  worker_type = 'staff',
  active = true
WHERE id = '50000000-0000-0000-0000-000000000008';

-- Keep Victor demo password aligned
UPDATE auth.users
SET
  encrypted_password = extensions.crypt('demo12', extensions.gen_salt('bf', 10)),
  updated_at = now()
WHERE email IN ('employee@example.com', 'staff@example.com');

-- 2) Historical WO reassignment
-- Pending owner approval → no worker yet
UPDATE public.work_orders
SET vendor_id = NULL
WHERE status = 'pending_owner_approval';

-- Escalated path (owner/contractor): Victor Chen
UPDATE public.work_orders w
SET
  vendor_id = '50000000-0000-0000-0000-000000000001',
  requires_owner_approval = true
WHERE w.status NOT IN ('canceled', 'pending_owner_approval')
  AND (
    COALESCE(w.requires_owner_approval, false) = true
    OR w.wo_type = 'capex'
    OR GREATEST(
         COALESCE(w.actual_cost, 0),
         COALESCE(w.estimated_cost, 0)
       ) >= 5000
    OR lower(coalesce(w.title, '') || ' ' || coalesce(w.description, ''))
         LIKE '%emergency%'
    OR GREATEST(
         COALESCE(w.actual_cost, 0),
         COALESCE(w.estimated_cost, 0)
       ) > COALESCE(
         (
           SELECT ma.approval_threshold
           FROM public.management_agreements ma
           WHERE ma.property_id = w.property_id
           ORDER BY ma.start_date DESC NULLS LAST
           LIMIT 1
         ),
         2500
       )
  );

-- In-house path: keep existing Harborline staff; otherwise Jordan Blake
UPDATE public.work_orders w
SET
  vendor_id = '50000000-0000-0000-0000-000000000008',
  requires_owner_approval = false
WHERE w.status NOT IN ('canceled', 'pending_owner_approval')
  AND NOT (
    COALESCE(w.requires_owner_approval, false) = true
    OR w.wo_type = 'capex'
    OR GREATEST(
         COALESCE(w.actual_cost, 0),
         COALESCE(w.estimated_cost, 0)
       ) >= 5000
    OR lower(coalesce(w.title, '') || ' ' || coalesce(w.description, ''))
         LIKE '%emergency%'
    OR GREATEST(
         COALESCE(w.actual_cost, 0),
         COALESCE(w.estimated_cost, 0)
       ) > COALESCE(
         (
           SELECT ma.approval_threshold
           FROM public.management_agreements ma
           WHERE ma.property_id = w.property_id
           ORDER BY ma.start_date DESC NULLS LAST
           LIMIT 1
         ),
         2500
       )
  )
  AND (
    w.vendor_id IS NULL
    OR w.vendor_id = '50000000-0000-0000-0000-000000000001'
    OR NOT EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = w.vendor_id AND v.worker_type = 'staff'
    )
  );
