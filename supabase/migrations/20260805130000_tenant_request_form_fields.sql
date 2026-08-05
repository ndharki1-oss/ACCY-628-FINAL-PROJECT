ALTER TABLE public.tenant_requests
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS recurring_issue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS request_date DATE;
