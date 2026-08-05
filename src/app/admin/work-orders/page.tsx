import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function AdminWorkOrdersPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: rows } = await supabase
    .from("work_orders")
    .select(
      "id, wo_number, wo_type, status, title, scheduled_date, actual_cost, properties(name), vendors(company_name)"
    )
    .order("scheduled_date", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Work Orders
      </h1>
      <p className="text-slate-600">
        Vendors complete work; property owners approve. Completion alone does not
        close the obligation.
      </p>
      <Card title="All assignments">
        <ul className="divide-y divide-slate-100">
          {(rows ?? []).map((w) => {
            const prop = Array.isArray(w.properties) ? w.properties[0] : w.properties;
            const vendor = Array.isArray(w.vendors) ? w.vendors[0] : w.vendors;
            return (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {w.wo_number}: {w.title}
                  </p>
                  <p className="text-slate-600">
                    {prop?.name} · {vendor?.company_name ?? "Unassigned"} ·{" "}
                    {w.wo_type} · {w.scheduled_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span>{formatMoney(w.actual_cost)}</span>
                  <Badge status={w.status} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
