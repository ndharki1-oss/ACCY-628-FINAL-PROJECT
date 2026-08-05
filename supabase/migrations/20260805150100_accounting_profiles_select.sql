DROP POLICY IF EXISTS profiles_accounting_select ON public.profiles;
CREATE POLICY profiles_accounting_select ON public.profiles FOR SELECT TO authenticated
  USING (private.is_accounting());
