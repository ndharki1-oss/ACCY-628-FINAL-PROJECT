-- Allow tenant payment flow to post agency fee recognition journals.
-- Tenants cannot INSERT journal_* under RLS (finance-only); this SECURITY DEFINER
-- RPC posts GL 2000 / 4000 lines only after verifying the caller owns the payment
-- (or is finance). No seed data changes.

CREATE OR REPLACE FUNCTION private.post_management_fee_on_payment(
  p_payment_id UUID,
  p_fee_amount NUMERIC,
  p_fee_percent NUMERIC,
  p_credit_rating TEXT,
  p_risk_tier TEXT,
  p_property_id UUID,
  p_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_existing UUID;
  v_owner_payable UUID;
  v_fee_revenue UUID;
  v_period_id UUID;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_memo TEXT;
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'payment_id required';
  END IF;

  IF COALESCE(p_fee_amount, 0) <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  IF v_payment.party_type IS DISTINCT FROM 'tenant' OR v_payment.tenant_id IS NULL THEN
    RAISE EXCEPTION 'payment is not a tenant collection';
  END IF;

  IF NOT (
    private.is_finance()
    OR v_payment.tenant_id IN (SELECT private.tenant_ids_for_user())
  ) THEN
    RAISE EXCEPTION 'not authorized to post fee for this payment';
  END IF;

  SELECT je.id INTO v_existing
  FROM public.journal_entries je
  WHERE je.source_type = 'payment'
    AND je.source_id = p_payment_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT id INTO v_owner_payable FROM public.gl_accounts WHERE code = '2000' LIMIT 1;
  SELECT id INTO v_fee_revenue FROM public.gl_accounts WHERE code = '4000' LIMIT 1;

  IF v_owner_payable IS NULL OR v_fee_revenue IS NULL THEN
    RAISE EXCEPTION 'required GL accounts 2000/4000 missing';
  END IF;

  SELECT id INTO v_period_id
  FROM public.accounting_periods
  WHERE year = EXTRACT(YEAR FROM v_payment.payment_date)::int
    AND month = EXTRACT(MONTH FROM v_payment.payment_date)::int
  LIMIT 1;

  v_entry_number := 'JE-FEE-' || replace(p_payment_id::text, '-', '');
  v_memo := format(
    'Management fee %s%% of collection (credit %s, risk %s)',
    trim(to_char(COALESCE(p_fee_percent, 0), 'FM999990.########')),
    COALESCE(NULLIF(trim(p_credit_rating), ''), 'BBB'),
    COALESCE(NULLIF(trim(p_risk_tier), ''), 'standard')
  );

  INSERT INTO public.journal_entries (
    entry_number,
    entry_date,
    memo,
    source_type,
    source_id,
    period_id,
    created_by
  )
  VALUES (
    v_entry_number,
    v_payment.payment_date,
    v_memo,
    'payment',
    p_payment_id,
    v_period_id,
    auth.uid()
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_lines (
    journal_entry_id,
    gl_account_id,
    debit,
    credit,
    property_id,
    owner_id
  )
  VALUES
    (
      v_entry_id,
      v_owner_payable,
      ROUND(p_fee_amount, 2),
      0,
      p_property_id,
      p_owner_id
    ),
    (
      v_entry_id,
      v_fee_revenue,
      0,
      ROUND(p_fee_amount, 2),
      p_property_id,
      p_owner_id
    );

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_management_fee_on_payment(
  p_payment_id UUID,
  p_fee_amount NUMERIC,
  p_fee_percent NUMERIC,
  p_credit_rating TEXT,
  p_risk_tier TEXT,
  p_property_id UUID,
  p_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN private.post_management_fee_on_payment(
    p_payment_id,
    p_fee_amount,
    p_fee_percent,
    p_credit_rating,
    p_risk_tier,
    p_property_id,
    p_owner_id
  );
END;
$$;

REVOKE ALL ON FUNCTION private.post_management_fee_on_payment(
  UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID, UUID
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.post_management_fee_on_payment(
  UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID, UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.post_management_fee_on_payment(
  UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID, UUID
) TO authenticated;
