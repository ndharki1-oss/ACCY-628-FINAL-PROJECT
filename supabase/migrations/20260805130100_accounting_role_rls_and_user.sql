-- Accounting department helpers, RLS, and demo user
-- Requires prior migration that adds user_role value 'accounting'.

CREATE OR REPLACE FUNCTION private.is_accounting()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'accounting'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_finance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_admin() OR private.is_accounting();
$$;

DROP POLICY IF EXISTS je_select ON public.journal_entries;
CREATE POLICY je_select ON public.journal_entries FOR SELECT TO authenticated
  USING (private.is_finance());

DROP POLICY IF EXISTS je_admin ON public.journal_entries;
CREATE POLICY je_admin ON public.journal_entries FOR ALL TO authenticated
  USING (private.is_finance()) WITH CHECK (private.is_finance());

DROP POLICY IF EXISTS jl_admin ON public.journal_lines;
CREATE POLICY jl_admin ON public.journal_lines FOR ALL TO authenticated
  USING (private.is_finance()) WITH CHECK (private.is_finance());

DROP POLICY IF EXISTS jl_accounting_select ON public.journal_lines;
CREATE POLICY jl_accounting_select ON public.journal_lines FOR SELECT TO authenticated
  USING (private.is_accounting());

DROP POLICY IF EXISTS periods_admin ON public.accounting_periods;
CREATE POLICY periods_admin ON public.accounting_periods FOR ALL TO authenticated
  USING (private.is_finance()) WITH CHECK (private.is_finance());

DROP POLICY IF EXISTS company_exp_admin ON public.company_expenses;
CREATE POLICY company_exp_admin ON public.company_expenses FOR ALL TO authenticated
  USING (private.is_finance()) WITH CHECK (private.is_finance());

DROP POLICY IF EXISTS properties_accounting_select ON public.properties;
CREATE POLICY properties_accounting_select ON public.properties FOR SELECT TO authenticated
  USING (private.is_accounting());

DROP POLICY IF EXISTS owners_accounting_select ON public.owners;
CREATE POLICY owners_accounting_select ON public.owners FOR SELECT TO authenticated
  USING (private.is_accounting());

DROP POLICY IF EXISTS leases_accounting_select ON public.leases;
CREATE POLICY leases_accounting_select ON public.leases FOR SELECT TO authenticated
  USING (private.is_accounting());

DROP POLICY IF EXISTS tenants_accounting_select ON public.tenants;
CREATE POLICY tenants_accounting_select ON public.tenants FOR SELECT TO authenticated
  USING (private.is_accounting());

DROP POLICY IF EXISTS costs_accounting_select ON public.cost_entries;
CREATE POLICY costs_accounting_select ON public.cost_entries FOR SELECT TO authenticated
  USING (private.is_accounting());

DROP POLICY IF EXISTS invoices_accounting_select ON public.invoices;
CREATE POLICY invoices_accounting_select ON public.invoices FOR SELECT TO authenticated
  USING (private.is_accounting());

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'e5555555-5555-5555-5555-555555555555',
  'authenticated',
  'authenticated',
  'accounting@example.com',
  extensions.crypt('Demo123!', extensions.gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"],"role":"accounting"}',
  '{"sub":"e5555555-5555-5555-5555-555555555555","email":"accounting@example.com","email_verified":true,"phone_verified":false,"full_name":"Alex Rivera"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  instance_id = EXCLUDED.instance_id,
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  confirmation_token = EXCLUDED.confirmation_token,
  recovery_token = EXCLUDED.recovery_token,
  email_change_token_new = EXCLUDED.email_change_token_new,
  email_change = EXCLUDED.email_change,
  updated_at = now();

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'e5555555-5555-5555-5555-555555555555',
  'e5555555-5555-5555-5555-555555555555',
  '{"sub":"e5555555-5555-5555-5555-555555555555","email":"accounting@example.com","email_verified":true}',
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider_id, provider) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = now();

INSERT INTO public.profiles (id, email, full_name, role, phone) VALUES (
  'e5555555-5555-5555-5555-555555555555',
  'accounting@example.com',
  'Alex Rivera',
  'accounting',
  '312-555-0104'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  updated_at = now();
