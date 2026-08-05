import { requireExactRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { closeAccountingPeriod } from "@/app/actions/business";

export default async function AccountingPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const [{ data: journals }, { data: periods }, { data: accounts }] =
    await Promise.all([
      supabase
        .from("journal_entries")
        .select(
          "id, entry_number, entry_date, memo, journal_lines(debit, credit, gl_accounts(code, name))"
        )
        .order("entry_date", { ascending: false }),
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

      <Card title="Journal entries">
        <div className="space-y-4">
          {(journals ?? []).map((je) => (
            <div key={je.id} className="rounded border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">
                  {je.entry_number} · {je.entry_date}
                </p>
                <p className="text-slate-600">{je.memo}</p>
              </div>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {((je.journal_lines as { debit: number; credit: number; gl_accounts: { code: string; name: string } | { code: string; name: string }[] }[]) ?? []).map(
                    (line, idx) => {
                      const gl = Array.isArray(line.gl_accounts)
                        ? line.gl_accounts[0]
                        : line.gl_accounts;
                      return (
                        <tr key={idx} className="border-t border-slate-50">
                          <td className="py-1">
                            {gl?.code} {gl?.name}
                          </td>
                          <td className="py-1 text-right">
                            {Number(line.debit) > 0 ? formatMoney(line.debit) : ""}
                          </td>
                          <td className="py-1 text-right">
                            {Number(line.credit) > 0 ? formatMoney(line.credit) : ""}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
