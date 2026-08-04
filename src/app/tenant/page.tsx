import { requireRole } from "@/lib/auth";
import { Badge, Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

export default async function TenantDashboard() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, company_name")
    .eq("profile_id", user.id)
    .maybeSingle();
  const tenantId =
    tenant?.id ??
    (await supabase.from("tenants").select("id").limit(1).single()).data?.id;

  const [{ data: lease }, { data: invoices }, { data: requests }] =
    await Promise.all([
      supabase
        .from("leases")
        .select("*, properties(name, address_line1, city, state)")
        .eq("tenant_id", tenantId!)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("due_date", { ascending: false }),
      supabase
        .from("tenant_requests")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("status", "open"),
    ]);

  const balance = (invoices ?? [])
    .filter((i) => !["paid", "void"].includes(i.status))
    .reduce((s, i) => s + Number(i.total) - Number(i.amount_paid), 0);

  const upcoming = (invoices ?? []).find((i) =>
    ["sent", "partial", "overdue"].includes(i.status)
  );

  const prop = lease
    ? Array.isArray(lease.properties)
      ? lease.properties[0]
      : lease.properties
    : null;

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Tenant portal
      </h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Balance due" value={formatMoney(balance)} />
        <Stat
          label="Lease status"
          value={lease?.status?.replaceAll("_", " ") ?? "—"}
        />
        <Stat label="Open requests" value={String((requests ?? []).length)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Current lease">
          {lease ? (
            <div className="text-sm">
              <p className="font-medium">{prop?.name}</p>
              <p className="text-slate-600">
                {prop?.address_line1}, {prop?.city}, {prop?.state}
              </p>
              <p className="mt-2">
                {lease.lease_number} · {formatMoney(lease.base_rent_monthly)}/mo
                rent + {formatMoney(lease.cam_monthly)} CAM
              </p>
              <div className="mt-2">
                <Badge status={lease.status} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No lease on file.</p>
          )}
        </Card>
        <Card
          title="Next action"
          action={
            <Link href="/tenant/invoices" className="text-sm text-[#c4784a]">
              Pay invoices →
            </Link>
          }
        >
          {upcoming ? (
            <p className="text-sm">
              {upcoming.invoice_number} due {upcoming.due_date}:{" "}
              {formatMoney(Number(upcoming.total) - Number(upcoming.amount_paid))}{" "}
              remaining <Badge status={upcoming.status} />
            </p>
          ) : (
            <p className="text-sm text-slate-600">No open invoices.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
