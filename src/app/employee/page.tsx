import { requireRole } from "@/lib/auth";
import { getLinkedVendorId } from "@/lib/portal";
import { PageHeading } from "@/components/page-heading";
import { Badge, Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

export default async function EmployeeDashboard() {
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
  const completed = (wos ?? []).filter(
    (w) => w.status === "approved" && w.completed_at
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Employee workspace"
        vital={vendor?.company_name ?? undefined}
      />
      {vendorError ? (
        <p className="text-sm text-rose-700">
          This login is not linked to an employee work record.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Upcoming / active" value={String(upcoming.length)} />
        <Stat label="Completed" value={String(completed.length)} />
      </div>
      <Card
        title="Today & upcoming"
        action={
          <Link href="/employee/work-orders" className="text-sm text-[#c4784a]">
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
      <p className="text-xs text-slate-500">
        Estimated pipeline value{" "}
        {formatMoney(
          upcoming.reduce((s, w) => s + Number(w.estimated_cost || 0), 0)
        )}
      </p>
    </div>
  );
}
