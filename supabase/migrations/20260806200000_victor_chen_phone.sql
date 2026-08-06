-- Set demo phone for Victor Chen / Chen Building Services only (vendors row).
-- Additive; does not rewrite prior seed migrations.
-- Reverse: ROLLBACK_20260806200000_victor_chen_phone.sql

UPDATE public.vendors
SET phone = '312-555-0147'
WHERE id = '50000000-0000-0000-0000-000000000001';
