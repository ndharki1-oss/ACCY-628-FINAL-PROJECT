import { requireRole } from "@/lib/auth";
import { getLinkedVendorId } from "@/lib/portal";
import { Badge, Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

export default async function VendorDashboard() {
  const { supabase, user } = await requireRole(["vendor"]);
  const { vendorId, vendor, error: vendorError } = await getLinkedVendorId(
    supabase,
    user
  );

  const { data: wos } = vendorId
    ? await supabase
        .from("work_orders")
        .select("*, properties(name)")
        .eq("vendor_id", vendorId)
        .order("scheduled_date", { ascending: true })
    : { data: [] };

  const upcoming = (wos ?? []).filter((w) =>
    ["assigned", "in_progress", "open"].includes(w.status)
  );
  const pending = (wos ?? []).filter((w) => w.status === "pending_owner_approval");
  const rejected = (wos ?? []).filter((w) => w.status === "rejected");

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Vendor workspace
      </h1>
      <p className="text-slate-600">
        {vendor?.company_name ?? "Assigned work orders and completion status."}
      </p>
      {vendorError ? <p className="text-sm text-rose-700">{vendorError}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming / active" value={String(upcoming.length)} />
        <Stat label="Awaiting owner approval" value={String(pending.length)} />
        <Stat label="Rejected / rework" value={String(rejected.length)} />
      </div>
      <Card
        title="Today & upcoming"
        action={
          <Link href="/vendor/work-orders" className="text-sm text-[#c4784a]">
            All assignments →
          </Link>
        }
      >
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-600">No upcoming assignments.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {upcoming.slice(0, 8).map((w) => {
              const prop = Array.isArray(w.properties) ? w.properties[0] : w.properties;
              return (
                <li key={w.id} className="flex justify-between border-b border-slate-50 py-2">
                  <span>
                    {w.scheduled_date}: {w.title} · {prop?.name}
                  </span>
                  <Badge status={w.status} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {rejected.length > 0 ? (
        <Card title="Needs rework">
          <ul className="space-y-2 text-sm">
            {rejected.map((w) => (
              <li key={w.id}>
                {w.wo_number}: {w.title} — {w.rejection_reason}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <p className="text-xs text-slate-500">
        Estimated pipeline value{" "}
        {formatMoney(
          (wos ?? []).reduce((s, w) => s + Number(w.estimated_cost || 0), 0)
        )}
      </p>
    </div>
  );
}
