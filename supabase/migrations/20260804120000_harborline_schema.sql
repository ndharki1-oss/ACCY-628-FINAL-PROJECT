-- Harborline Commercial Management — core schema, helpers, RLS, period lock

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'owner', 'tenant', 'vendor');
CREATE TYPE public.lease_type AS ENUM ('nnn', 'modified_gross', 'full_service', 'percentage_rent');
CREATE TYPE public.lease_status AS ENUM ('draft', 'active', 'renewal_pending', 'expired', 'canceled', 'terminated');
CREATE TYPE public.amendment_type AS ENUM ('renewal', 'expansion', 'termination', 'concession', 'other');
CREATE TYPE public.wo_type AS ENUM ('preventive', 'tenant', 'capex', 'inspection', 'leasing');
CREATE TYPE public.wo_status AS ENUM ('open', 'assigned', 'in_progress', 'pending_owner_approval', 'approved', 'rejected', 'canceled');
CREATE TYPE public.cost_category AS ENUM (
  'labor', 'vendor', 'materials', 'utilities', 'insurance', 'taxes',
  'advertising', 'travel', 'equipment', 'payroll', 'parts', 'other'
);
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'disputed', 'void');
CREATE TYPE public.invoice_party AS ENUM ('tenant', 'owner');
CREATE TYPE public.deposit_status AS ENUM ('held', 'applied', 'refunded', 'disputed');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.period_status AS ENUM ('open', 'closed');

-- Profiles (role in table; also mirrored to auth.app_metadata via trigger/seed)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  mailing_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  postal_code TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'office',
  square_feet INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_code TEXT NOT NULL,
  floor TEXT,
  square_feet INTEGER,
  UNIQUE (property_id, unit_code)
);

CREATE TABLE public.management_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  fee_percent NUMERIC(6,3) NOT NULL CHECK (fee_percent > 0 AND fee_percent <= 100),
  approval_threshold NUMERIC(12,2) NOT NULL DEFAULT 2500,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  lease_number TEXT NOT NULL UNIQUE,
  lease_type public.lease_type NOT NULL,
  status public.lease_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  base_rent_monthly NUMERIC(12,2) NOT NULL,
  cam_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentage_rent_rate NUMERIC(6,3),
  billing_day INTEGER NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  security_deposit_required NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_fee_percent NUMERIC(6,3) NOT NULL DEFAULT 5,
  grace_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lease_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  amendment_type public.amendment_type NOT NULL,
  effective_date DATE NOT NULL,
  description TEXT NOT NULL,
  rent_change NUMERIC(12,2),
  owner_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id),
  lease_id UUID REFERENCES public.leases(id),
  vendor_id UUID REFERENCES public.vendors(id),
  wo_number TEXT NOT NULL UNIQUE,
  wo_type public.wo_type NOT NULL,
  status public.wo_status NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  vendor_notes TEXT,
  owner_approved_at TIMESTAMPTZ,
  owner_approved_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  actual_cost NUMERIC(12,2) DEFAULT 0,
  requires_owner_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id),
  lease_id UUID REFERENCES public.leases(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  vendor_id UUID REFERENCES public.vendors(id),
  category public.cost_category NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  incurred_date DATE NOT NULL,
  owner_approved BOOLEAN NOT NULL DEFAULT false,
  owner_approved_at TIMESTAMPTZ,
  admin_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  billed_on_statement BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  party_type public.invoice_party NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  owner_id UUID REFERENCES public.owners(id),
  lease_id UUID REFERENCES public.leases(id),
  property_id UUID REFERENCES public.properties(id),
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  dispute_reason TEXT,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (party_type = 'tenant' AND tenant_id IS NOT NULL) OR
    (party_type = 'owner' AND owner_id IS NOT NULL)
  )
);

CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  gl_hint TEXT
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  party_type public.invoice_party NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  owner_id UUID REFERENCES public.owners(id),
  payment_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'ach',
  is_auto_pay BOOLEAN NOT NULL DEFAULT false,
  reference TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  UNIQUE (payment_id, invoice_id)
);

CREATE TABLE public.auto_pay_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id UUID UNIQUE REFERENCES public.owners(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  method TEXT NOT NULL DEFAULT 'ach',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (tenant_id IS NOT NULL OR owner_id IS NOT NULL)
);

CREATE TABLE public.security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  amount NUMERIC(12,2) NOT NULL,
  status public.deposit_status NOT NULL DEFAULT 'held',
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.owner_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_number TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.owners(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_collections NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  management_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  remittance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.owner_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.owner_statements(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference_id UUID
);

CREATE TABLE public.gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit'))
);

CREATE TABLE public.accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status public.period_status NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id),
  UNIQUE (year, month)
);

CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  memo TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  period_id UUID REFERENCES public.accounting_periods(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  gl_account_id UUID NOT NULL REFERENCES public.gl_accounts(id),
  debit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  property_id UUID REFERENCES public.properties(id),
  owner_id UUID REFERENCES public.owners(id),
  CHECK (debit = 0 OR credit = 0)
);

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  requested_by UUID REFERENCES public.profiles(id),
  approver_role public.user_role NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(12,2),
  notes TEXT,
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  lease_id UUID REFERENCES public.leases(id),
  property_id UUID REFERENCES public.properties(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.company_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  incurred_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX idx_leases_property ON public.leases(property_id);
CREATE INDEX idx_wo_vendor ON public.work_orders(vendor_id);
CREATE INDEX idx_wo_property ON public.work_orders(property_id);
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_cost_property ON public.cost_entries(property_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);

-- Role helpers (SECURITY DEFINER in private schema)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.owner_ids_for_user()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.owners WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.tenant_ids_for_user()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.vendor_ids_for_user()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.vendors WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.write_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_detail JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, detail)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_detail);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_period_open(p_date DATE)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT status = 'open'
      FROM public.accounting_periods
      WHERE year = EXTRACT(YEAR FROM p_date)::int
        AND month = EXTRACT(MONTH FROM p_date)::int
    ),
    true
  );
$$;

-- Cost approval threshold enforcement
CREATE OR REPLACE FUNCTION public.enforce_cost_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold NUMERIC(12,2);
BEGIN
  SELECT ma.approval_threshold INTO v_threshold
  FROM public.management_agreements ma
  WHERE ma.property_id = NEW.property_id;

  v_threshold := COALESCE(v_threshold, 2500);

  IF NEW.amount > v_threshold AND NEW.owner_approved = false AND NEW.admin_override = false THEN
    IF TG_OP = 'UPDATE' AND NEW.owner_approved IS DISTINCT FROM OLD.owner_approved THEN
      NULL;
    END IF;
    -- Allow insert of unapproved high-dollar costs (pending), but block marking billed
    IF NEW.billed_on_statement = true THEN
      RAISE EXCEPTION 'Cost % exceeds approval threshold % and is not owner-approved', NEW.amount, v_threshold;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cost_approval
  BEFORE INSERT OR UPDATE ON public.cost_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cost_approval();

-- Update invoice paid amounts
CREATE OR REPLACE FUNCTION public.refresh_invoice_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_paid NUMERIC(12,2);
  v_total NUMERIC(12,2);
  v_status public.invoice_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.payment_applications WHERE invoice_id = v_invoice_id;

  SELECT total, status INTO v_total, v_status
  FROM public.invoices WHERE id = v_invoice_id;

  IF v_status = 'void' OR v_status = 'disputed' THEN
    UPDATE public.invoices SET amount_paid = v_paid WHERE id = v_invoice_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.invoices
  SET
    amount_paid = v_paid,
    status = CASE
      WHEN v_paid <= 0 AND due_date < CURRENT_DATE THEN 'overdue'::public.invoice_status
      WHEN v_paid <= 0 THEN 'sent'::public.invoice_status
      WHEN v_paid < total THEN 'partial'::public.invoice_status
      ELSE 'paid'::public.invoice_status
    END
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_payment_app_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_applications
  FOR EACH ROW EXECUTE FUNCTION public.refresh_invoice_payment_status();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_pay_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (private.is_admin() OR id = auth.uid());
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Owners
CREATE POLICY owners_admin ON public.owners FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY owners_self_select ON public.owners FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin());

-- Vendors
CREATE POLICY vendors_admin ON public.vendors FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY vendors_self_select ON public.vendors FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin());

-- Tenants
CREATE POLICY tenants_admin ON public.tenants FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY tenants_self_select ON public.tenants FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin());

-- Properties
CREATE POLICY properties_admin ON public.properties FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY properties_owner_select ON public.properties FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()) OR private.is_admin());
CREATE POLICY properties_tenant_select ON public.properties FOR SELECT TO authenticated
  USING (
    id IN (SELECT property_id FROM public.leases WHERE tenant_id IN (SELECT private.tenant_ids_for_user()))
    OR private.is_admin()
  );
CREATE POLICY properties_vendor_select ON public.properties FOR SELECT TO authenticated
  USING (
    id IN (SELECT property_id FROM public.work_orders WHERE vendor_id IN (SELECT private.vendor_ids_for_user()))
    OR private.is_admin()
  );

-- Units
CREATE POLICY units_admin ON public.units FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY units_select ON public.units FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties)
  );

-- Management agreements
CREATE POLICY ma_admin ON public.management_agreements FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY ma_owner_select ON public.management_agreements FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()) OR private.is_admin());

-- Leases
CREATE POLICY leases_admin ON public.leases FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY leases_owner_select ON public.leases FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT private.owner_ids_for_user()))
    OR private.is_admin()
  );
CREATE POLICY leases_tenant_select ON public.leases FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT private.tenant_ids_for_user()) OR private.is_admin());

-- Amendments
CREATE POLICY amendments_admin ON public.lease_amendments FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY amendments_select ON public.lease_amendments FOR SELECT TO authenticated
  USING (
    lease_id IN (SELECT id FROM public.leases)
  );

-- Work orders
CREATE POLICY wo_admin ON public.work_orders FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY wo_owner_select ON public.work_orders FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT private.owner_ids_for_user()))
    OR private.is_admin()
  );
CREATE POLICY wo_owner_update ON public.work_orders FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT private.owner_ids_for_user()))
  )
  WITH CHECK (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT private.owner_ids_for_user()))
  );
CREATE POLICY wo_vendor_select ON public.work_orders FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT private.vendor_ids_for_user()) OR private.is_admin());
CREATE POLICY wo_vendor_update ON public.work_orders FOR UPDATE TO authenticated
  USING (vendor_id IN (SELECT private.vendor_ids_for_user()))
  WITH CHECK (vendor_id IN (SELECT private.vendor_ids_for_user()));
CREATE POLICY wo_tenant_select ON public.work_orders FOR SELECT TO authenticated
  USING (
    lease_id IN (SELECT id FROM public.leases WHERE tenant_id IN (SELECT private.tenant_ids_for_user()))
    OR private.is_admin()
  );

-- Costs
CREATE POLICY costs_admin ON public.cost_entries FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY costs_owner_select ON public.cost_entries FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()) OR private.is_admin());
CREATE POLICY costs_owner_update ON public.cost_entries FOR UPDATE TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()))
  WITH CHECK (owner_id IN (SELECT private.owner_ids_for_user()));
CREATE POLICY costs_vendor_select ON public.cost_entries FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT private.vendor_ids_for_user()) OR private.is_admin());
CREATE POLICY costs_vendor_insert ON public.cost_entries FOR INSERT TO authenticated
  WITH CHECK (vendor_id IN (SELECT private.vendor_ids_for_user()) OR private.is_admin());

-- Invoices
CREATE POLICY invoices_admin ON public.invoices FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY invoices_tenant_select ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT private.tenant_ids_for_user()) OR private.is_admin());
CREATE POLICY invoices_owner_select ON public.invoices FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()) OR private.is_admin());

CREATE POLICY invoice_lines_admin ON public.invoice_lines FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY invoice_lines_select ON public.invoice_lines FOR SELECT TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices));

-- Payments
CREATE POLICY payments_admin ON public.payments FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY payments_tenant_select ON public.payments FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT private.tenant_ids_for_user()) OR private.is_admin());
CREATE POLICY payments_tenant_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT private.tenant_ids_for_user()) OR private.is_admin());
CREATE POLICY payments_owner_select ON public.payments FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()) OR private.is_admin());

CREATE POLICY pay_apps_admin ON public.payment_applications FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY pay_apps_select ON public.payment_applications FOR SELECT TO authenticated
  USING (payment_id IN (SELECT id FROM public.payments));
CREATE POLICY pay_apps_tenant_insert ON public.payment_applications FOR INSERT TO authenticated
  WITH CHECK (
    payment_id IN (SELECT id FROM public.payments WHERE tenant_id IN (SELECT private.tenant_ids_for_user()))
    OR private.is_admin()
  );

-- Auto pay
CREATE POLICY autopay_admin ON public.auto_pay_settings FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY autopay_tenant ON public.auto_pay_settings FOR ALL TO authenticated
  USING (tenant_id IN (SELECT private.tenant_ids_for_user()))
  WITH CHECK (tenant_id IN (SELECT private.tenant_ids_for_user()));
CREATE POLICY autopay_owner ON public.auto_pay_settings FOR ALL TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()))
  WITH CHECK (owner_id IN (SELECT private.owner_ids_for_user()));

-- Deposits
CREATE POLICY deposits_admin ON public.security_deposits FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY deposits_tenant ON public.security_deposits FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT private.tenant_ids_for_user()) OR private.is_admin());
CREATE POLICY deposits_owner ON public.security_deposits FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT private.owner_ids_for_user()))
    OR private.is_admin()
  );

-- Owner statements
CREATE POLICY statements_admin ON public.owner_statements FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY statements_owner ON public.owner_statements FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()) OR private.is_admin());
CREATE POLICY statement_lines_admin ON public.owner_statement_lines FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY statement_lines_select ON public.owner_statement_lines FOR SELECT TO authenticated
  USING (statement_id IN (SELECT id FROM public.owner_statements));

-- GL / journals / periods — admin full; owners read limited journals for their props
CREATE POLICY gl_select ON public.gl_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY gl_admin ON public.gl_accounts FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY periods_select ON public.accounting_periods FOR SELECT TO authenticated
  USING (private.is_admin() OR true);
CREATE POLICY periods_admin ON public.accounting_periods FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY je_admin ON public.journal_entries FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY je_select ON public.journal_entries FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY jl_admin ON public.journal_lines FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY jl_owner_select ON public.journal_lines FOR SELECT TO authenticated
  USING (owner_id IN (SELECT private.owner_ids_for_user()) OR private.is_admin());

CREATE POLICY approvals_admin ON public.approvals FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY approvals_owner ON public.approvals FOR ALL TO authenticated
  USING (private.current_role() = 'owner' OR private.is_admin())
  WITH CHECK (private.current_role() = 'owner' OR private.is_admin());

CREATE POLICY audit_admin ON public.audit_log FOR SELECT TO authenticated
  USING (private.is_admin());
CREATE POLICY audit_insert ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY requests_admin ON public.tenant_requests FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY requests_tenant ON public.tenant_requests FOR ALL TO authenticated
  USING (tenant_id IN (SELECT private.tenant_ids_for_user()))
  WITH CHECK (tenant_id IN (SELECT private.tenant_ids_for_user()));
CREATE POLICY requests_owner_select ON public.tenant_requests FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT private.owner_ids_for_user()))
    OR private.is_admin()
  );

CREATE POLICY company_exp_admin ON public.company_expenses FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Seed chart of accounts
INSERT INTO public.gl_accounts (code, name, account_type, normal_balance) VALUES
  ('1000', 'Cash', 'asset', 'debit'),
  ('1100', 'Tenant Accounts Receivable', 'asset', 'debit'),
  ('1200', 'Management Fee Receivable', 'asset', 'debit'),
  ('2000', 'Owner Payable (Due to Owner)', 'liability', 'credit'),
  ('2100', 'Security Deposit Liability', 'liability', 'credit'),
  ('2200', 'Unearned / Prepaid Rent', 'liability', 'credit'),
  ('4000', 'Management Fee Revenue', 'revenue', 'credit'),
  ('4100', 'Late Fee Income (Owner)', 'revenue', 'credit'),
  ('5000', 'Property Operating Expense', 'expense', 'debit'),
  ('5100', 'Company Operating Expense', 'expense', 'debit');

-- Open periods for 2025-2026
INSERT INTO public.accounting_periods (year, month, status)
SELECT y, m, 'open'
FROM generate_series(2025, 2026) AS y,
     generate_series(1, 12) AS m;
