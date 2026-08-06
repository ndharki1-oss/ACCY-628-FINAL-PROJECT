-- Update Harborline staff specialties only (additive; no prior seed file edits).

UPDATE public.vendors SET specialty = v.specialty
FROM (
  VALUES
    ('50000000-0000-0000-0000-000000000007'::uuid, 'pest control'),
    ('50000000-0000-0000-0000-000000000008'::uuid, 'general maintenance'),
    ('50000000-0000-0000-0000-000000000009'::uuid, 'HVAC'),
    ('50000000-0000-0000-0000-000000000010'::uuid, 'electrical'),
    ('50000000-0000-0000-0000-000000000011'::uuid, 'plumbing')
) AS v(id, specialty)
WHERE public.vendors.id = v.id
  AND public.vendors.worker_type = 'staff';
