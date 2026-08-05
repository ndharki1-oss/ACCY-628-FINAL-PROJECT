-- Rename demo vendor login email to employee (keep profiles.role = vendor for RLS).
-- auth.identities.email is generated from identity_data; do not update it directly.

UPDATE auth.users
SET
  email = 'employee@example.com',
  updated_at = now()
WHERE id = 'd4444444-4444-4444-4444-444444444444'
   OR email IN ('vendor@example.com', 'vendor@harborline.demo');

UPDATE auth.identities
SET
  identity_data = jsonb_set(
    COALESCE(identity_data, '{}'::jsonb),
    '{email}',
    '"employee@example.com"'
  ),
  updated_at = now()
WHERE user_id = 'd4444444-4444-4444-4444-444444444444'
   OR identity_data->>'email' IN ('vendor@example.com', 'vendor@harborline.demo');

UPDATE public.profiles
SET
  email = 'employee@example.com',
  updated_at = now()
WHERE id = 'd4444444-4444-4444-4444-444444444444'
   OR email IN ('vendor@example.com', 'vendor@harborline.demo');

UPDATE public.vendors
SET
  email = 'employee@example.com'
WHERE profile_id = 'd4444444-4444-4444-4444-444444444444'
   OR email IN ('vendor@example.com', 'vendor@harborline.demo');
