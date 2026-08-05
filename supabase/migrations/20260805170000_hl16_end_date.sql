-- Shorten Michigan Avenue Suites lease HL-16 to expire in ~3 months from course timeline.
UPDATE public.leases
SET end_date = DATE '2026-11-05'
WHERE id = '60000000-0000-0000-0000-000000000016';
