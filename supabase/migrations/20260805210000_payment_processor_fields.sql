-- PCI-aligned payment metadata (nullable; existing seed rows unchanged).
-- Harborline stores processor tokens / last4 only — never PAN, CVV, or full account numbers.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS processor TEXT,
  ADD COLUMN IF NOT EXISTS processor_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS processor_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS card_brand TEXT,
  ADD COLUMN IF NOT EXISTS card_last4 TEXT;

COMMENT ON COLUMN public.payments.processor IS 'Payment processor name (e.g. stripe, stripe_test_sim).';
COMMENT ON COLUMN public.payments.processor_payment_id IS 'Processor charge/PaymentIntent id — not sensitive card data.';
COMMENT ON COLUMN public.payments.processor_payment_method_id IS 'Processor payment_method token id.';
COMMENT ON COLUMN public.payments.card_brand IS 'Display brand from processor (visa, mastercard, us_bank_account, etc.).';
COMMENT ON COLUMN public.payments.card_last4 IS 'Last 4 digits from processor — never full PAN.';

ALTER TABLE public.auto_pay_settings
  ADD COLUMN IF NOT EXISTS processor TEXT,
  ADD COLUMN IF NOT EXISTS processor_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS card_brand TEXT,
  ADD COLUMN IF NOT EXISTS card_last4 TEXT;

COMMENT ON COLUMN public.auto_pay_settings.processor_payment_method_id IS 'Saved processor payment method token for autopay drafts.';
