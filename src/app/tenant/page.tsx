import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { PageHeading } from "@/components/page-heading";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

function getLeaseTimeRemaining(endDate: string) {
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let label: string;
  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    label = overdue === 1 ? "Ended 1 day ago" : `Ended ${overdue} days ago`;
  } else if (diffDays === 0) {
    label = "Ends today";
  } else if (diffDays === 1) {
    label = "1 day left";
  } else if (diffDays < 60) {
    label = `${diffDays} days left`;
  } else {
    const months = Math.floor(diffDays / 30);
    const remDays = diffDays % 30;
    if (months < 12) {
      label =
        remDays === 0
          ? months === 1
            ? "1 month left"
            : `${months} months left`
          : `${months} mo, ${remDays} day${remDays === 1 ? "" : "s"} left`;
    } else {
      const years = Math.floor(months / 12);
      const remMonths = months % 12;
      label =
        remMonths === 0
          ? years === 1
            ? "1 year left"
            : `${years} years left`
          : `${years} yr, ${remMonths} mo left`;
    }
  }

  // Flag leases within 6 months (~183 days), including already expired.
  const urgent = diffDays <= 183;

  return { label, urgent };
}

export default async function TenantDashboard() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId, tenant, error: tenantError } = await getLinkedTenantId(
    supabase,
    user
  );

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Tenant Portal
          </h1>
          <p className="text-sm text-rose-700">
            {tenantError ?? "This login is not linked to a tenant record."}
          </p>
        </div>
      </div>
    );
  }

  const [{ data: leases }, { data: invoices }, { data: requests }] =
    await Promise.all([
      supabase
        .from("leases")
        .select("*, properties(name, address_line1, city, state)")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false }),
      supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: false }),
      supabase
        .from("tenant_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

  const balance = (invoices ?? [])
    .filter((i) => !["paid", "void"].includes(i.status))
    .reduce((s, i) => s + Number(i.total) - Number(i.amount_paid), 0);

  const upcoming = (invoices ?? []).find((i) =>
    ["sent", "partial", "overdue"].includes(i.status)
  );

  const openRequests = (requests ?? []).filter((r) =>
    ["open", "in_progress", "assigned"].includes(r.status)
  );

  return (
    <div className="space-y-6">
      <PageHeading title="Tenant Portal" />

      <div className="grid gap-4">
        <Card title="Balance Due">
          <p className="text-4xl font-semibold tracking-tight text-[#0c1f2e] tabular-nums">
            {formatMoney(balance)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Across open invoices{" "}
            {tenant?.company_name ? `for ${tenant.company_name}` : ""}
          </p>

          <Link
            href="/tenant/invoices"
            className="mt-4 inline-flex rounded bg-[#c4784a] px-4 py-2 text-sm font-medium text-white hover:bg-[#b0683e]"
          >
            Make a Payment
          </Link>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Next Action
              </h3>
              <Link
                href="/tenant/invoices"
                className="text-sm text-[#c4784a] hover:underline"
              >
                View payments →
              </Link>
            </div>
            {upcoming ? (
              <div className="text-sm">
                <p className="font-medium text-[#0c1f2e]">
                  {upcoming.invoice_number}
                </p>
                <p className="mt-1 text-slate-600">
                  Due {upcoming.due_date}:{" "}
                  {formatMoney(
                    Number(upcoming.total) - Number(upcoming.amount_paid)
                  )}{" "}
                  remaining
                </p>
                <div className="mt-2">
                  <Badge status={upcoming.status} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No open invoices. You&apos;re all caught up.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="My Leases"
          action={
            <Link
              href="/tenant/lease"
              className="text-sm text-[#c4784a] hover:underline"
            >
              View all →
            </Link>
          }
        >
          {(leases ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No leases on file.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {(leases ?? []).slice(0, 3).map((lease) => {
                const prop = Array.isArray(lease.properties)
                  ? lease.properties[0]
                  : lease.properties;
                const remaining = lease.end_date
                  ? getLeaseTimeRemaining(lease.end_date)
                  : null;
                return (
                  <li
                    key={lease.id}
                    className="border-b border-slate-50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#0c1f2e]">
                          {prop?.name ?? lease.lease_number}
                        </p>
                        <p className="text-slate-600">
                          {prop?.address_line1
                            ? `${prop.address_line1}, ${prop.city}, ${prop.state}`
                            : lease.lease_number}
                        </p>
                        <p className="mt-1 text-slate-600">
                          {formatMoney(lease.base_rent_monthly)}/mo +{" "}
                          {formatMoney(lease.cam_monthly)} CAM
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge status={lease.status} />
                        {remaining ? (
                          <p
                            className={`text-right text-xs ${
                              remaining.urgent
                                ? "font-medium text-red-600"
                                : "text-slate-500"
                            }`}
                          >
                            {remaining.label}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {(leases ?? []).length > 3 ? (
            <p className="mt-3 text-xs text-slate-500">
              +{(leases ?? []).length - 3} more on My Leases
            </p>
          ) : null}
        </Card>

        <Card
          title="Maintenance Requests"
          action={
            <Link
              href="/tenant/requests"
              className="text-sm text-[#c4784a] hover:underline"
            >
              Manage →
            </Link>
          }
        >
          <p className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
            {openRequests.length}
          </p>
          <p className="mt-1 text-sm text-slate-600">Open requests</p>

          {openRequests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No open maintenance requests.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {openRequests.slice(0, 3).map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-2 border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-[#0c1f2e]">{r.title}</p>
                    {r.description ? (
                      <p className="line-clamp-2 text-xs text-slate-500">
                        {r.description}
                      </p>
                    ) : null}
                  </div>
                  <Badge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
