import { requireExactRole } from "@/lib/auth";
import { Card } from "@/components/ui";

export default async function AccountingPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const { data: accounts } = await supabase
    .from("gl_accounts")
    .select("code, name, account_type")
    .order("code");

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
    </div>
  );
}
