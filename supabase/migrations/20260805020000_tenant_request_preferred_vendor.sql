ALTER TABLE public.tenant_requests
  ADD COLUMN IF NOT EXISTS preferred_vendor TEXT;
