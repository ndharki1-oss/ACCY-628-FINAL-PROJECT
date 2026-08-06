-- Reverse title-case specialty update (restores prior lowercase / mixed values).

UPDATE public.vendors v
SET specialty = m.specialty
FROM (
  VALUES
    ('50000000-0000-0000-0000-000000000001'::uuid, 'General maintenance'),
    ('50000000-0000-0000-0000-000000000007'::uuid, 'pest control'),
    ('50000000-0000-0000-0000-000000000008'::uuid, 'general maintenance'),
    ('50000000-0000-0000-0000-000000000009'::uuid, 'HVAC'),
    ('50000000-0000-0000-0000-000000000010'::uuid, 'electrical'),
    ('50000000-0000-0000-0000-000000000011'::uuid, 'plumbing')
) AS m(id, specialty)
WHERE v.id = m.id;
