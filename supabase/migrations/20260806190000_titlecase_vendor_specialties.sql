-- Title-case Harborline staff + Victor Chen specialties (additive; no seed rewrites).
-- Reverse: ROLLBACK_20260806190000_titlecase_vendor_specialties.sql

UPDATE public.vendors v
SET specialty = m.specialty
FROM (
  VALUES
    ('50000000-0000-0000-0000-000000000001'::uuid, 'General Maintenance'),
    ('50000000-0000-0000-0000-000000000007'::uuid, 'Pest Control'),
    ('50000000-0000-0000-0000-000000000008'::uuid, 'General Maintenance'),
    ('50000000-0000-0000-0000-000000000009'::uuid, 'HVAC'),
    ('50000000-0000-0000-0000-000000000010'::uuid, 'Electrical'),
    ('50000000-0000-0000-0000-000000000011'::uuid, 'Plumbing')
) AS m(id, specialty)
WHERE v.id = m.id
  AND (
    v.worker_type = 'staff'
    OR v.id = '50000000-0000-0000-0000-000000000001'::uuid
  );
