import { requireExactRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { closeAccountingPeriod } from "@/app/actions/business";

export default async function AccountingPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const [{ data: periods }, { data: accounts }] = await Promise.all([
    supabase
      .from("accounting_periods")
      .select("id, year, month, status")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(18),
    supabase.from("gl_accounts").select("code, name, account_type").order("code"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Accounting (GAAP agency)
      </h1>
      <p className="max-w-3xl text-slate-600">
        Rent collections increase Cash and Owner Payable — not Harborline revenue.
        Management fee revenue is recognized when rent is collected (% of
        collected). Security deposits are liability (escrow), not income.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Chart of accounts">
          <ul className="space-y-1 text-sm">
            {(accounts ?? []).map((a) => (
              <li key={a.code} className="flex justify-between border-b border-slate-50 py-1">
                <span>
                  <span className="font-mono text-xs">{a.code}</span> {a.name}
                </span>
                <span className="text-xs uppercase text-slate-500">
                  {a.account_type}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Accounting periods">
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {(periods ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>
                  {p.year}-{String(p.month).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2">
                  <Badge status={p.status} />
                  {p.status === "open" ? (
                    <form action={closeAccountingPeriod}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
