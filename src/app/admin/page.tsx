import { requireRole } from "@/lib/auth";
import { Badge, Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

export default async function AdminDashboard() {
  const { supabase } = await requireRole(["admin"]);

  const [
    { count: owners },
    { count: properties },
    { count: leases },
    { data: invoices },
    { data: pendingWo },
    { data: fees },
    { data: periods },
  ] = await Promise.all([
    supabase.from("owners").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("leases").select("*", { count: "exact", head: true }),
    supabase
      .from("invoices")
      .select("id, total, amount_paid, status, due_date, invoice_number")
      .eq("party_type", "tenant")
      .in("status", ["sent", "partial", "overdue", "disputed"]),
    supabase
      .from("work_orders")
      .select("id, wo_number, title, status, actual_cost")
      .eq("status", "pending_owner_approval"),
    supabase
      .from("journal_lines")
      .select("credit, gl_accounts!inner(code)")
      .eq("gl_accounts.code", "4000"),
    supabase
      .from("accounting_periods")
      .select("id, year, month, status")
      .eq("status", "open")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(3),
  ]);

  const arOpen = (invoices ?? []).reduce(
    (s, i) => s + Number(i.total) - Number(i.amount_paid),
    0
  );
  const feeRevenue = (fees ?? []).reduce((s, r) => s + Number(r.credit), 0);
  const overdue = (invoices ?? []).filter((i) => i.status === "overdue");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          Admin workspace
        </h1>
        <p className="mt-1 text-slate-600">
          Contract-to-cash controls, AR, fee revenue, and period close.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Owners" value={String(owners ?? 0)} />
        <Stat label="Properties" value={String(properties ?? 0)} />
        <Stat label="Active portfolio leases" value={String(leases ?? 0)} />
        <Stat
          label="Open tenant AR"
          value={formatMoney(arOpen)}
          hint={`${overdue.length} overdue`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Fee revenue recognized (GAAP: on collection)"
          action={
            <Link href="/admin/accounting" className="text-sm text-[#c4784a]">
              Journals →
            </Link>
          }
        >
          <p className="font-[family-name:var(--font-display)] text-3xl">
            {formatMoney(feeRevenue)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Management fees credit account 4000 only when rent is collected
            (agency model — rent itself is Due to Owner, not Harborline revenue).
          </p>
        </Card>

        <Card title="Unapproved work / spend risk">
          {(pendingWo ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No WOs awaiting owner approval.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(pendingWo ?? []).map((w) => (
                <li key={w.id} className="flex justify-between gap-2 border-b border-slate-100 py-2">
                  <span>
                    {w.wo_number}: {w.title}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatMoney(w.actual_cost)}
                    <Badge status={w.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Period close checklist">
        <ul className="space-y-2 text-sm">
          {(periods ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>
                {p.year}-{String(p.month).padStart(2, "0")}
              </span>
              <Badge status={p.status} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Closed periods block backdated postings without admin override + audit.
        </p>
      </Card>
    </div>
  );
}
