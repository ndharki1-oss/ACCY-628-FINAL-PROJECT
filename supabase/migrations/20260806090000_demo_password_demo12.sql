-- Set shared demo login password to demo12 for all five @example.com accounts.
UPDATE auth.users
SET
  encrypted_password = extensions.crypt('demo12', extensions.gen_salt('bf', 10)),
  updated_at = now()
WHERE email IN (
  'admin@example.com',
  'owner@example.com',
  'tenant@example.com',
  'employee@example.com',
  'accounting@example.com'
);
