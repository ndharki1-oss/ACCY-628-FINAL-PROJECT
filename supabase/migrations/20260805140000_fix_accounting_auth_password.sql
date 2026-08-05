-- Ensure accounting demo password uses GoTrue-compatible bcrypt (cost 10), matching other demos.
-- Critical: instance_id must be the GoTrue default UUID or login returns invalid_credentials.
UPDATE auth.users
SET
  instance_id = '00000000-0000-0000-0000-000000000000',
  encrypted_password = extensions.crypt('Demo123!', extensions.gen_salt('bf', 10)),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  raw_user_meta_data = COALESCE(
    raw_user_meta_data,
    '{}'::jsonb
  ) || jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  updated_at = now()
WHERE id = 'e5555555-5555-5555-5555-555555555555'
   OR email = 'accounting@example.com';
