-- Display-friendly unit codes: drop marketing "Open " prefix on demo vacant suites.
UPDATE public.units
SET unit_code = regexp_replace(unit_code, '^Open\s+', '', 'i')
WHERE unit_code ~* '^Open\s+';
