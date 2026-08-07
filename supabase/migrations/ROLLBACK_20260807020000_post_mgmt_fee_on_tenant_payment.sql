-- Reverse 20260807020000_post_mgmt_fee_on_tenant_payment.sql

DROP FUNCTION IF EXISTS public.post_management_fee_on_payment(
  UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID, UUID
);
DROP FUNCTION IF EXISTS private.post_management_fee_on_payment(
  UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID, UUID
);
