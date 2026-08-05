-- Allow canceling linked work orders when a tenant cancels their maintenance request.

CREATE OR REPLACE FUNCTION private.sync_wo_on_request_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'canceled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.work_orders
    SET status = 'canceled'
    WHERE tenant_request_id = NEW.id
      AND status IS DISTINCT FROM 'canceled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_request_cancel_wo ON public.tenant_requests;
CREATE TRIGGER trg_tenant_request_cancel_wo
AFTER UPDATE OF status ON public.tenant_requests
FOR EACH ROW
EXECUTE FUNCTION private.sync_wo_on_request_cancel();
