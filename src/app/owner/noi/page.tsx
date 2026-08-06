import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Card } from "@/components/ui";
import { MetricInfoTip } from "@/components/owner/metric-info-tip";
import { NoiRangePills } from "@/components/owner/noi-range-pills";
import { formatMoney } from "@/lib/utils";
import { METRIC_EXPLAINERS } from "@/lib/owner/metric-explainers";
import {
  formatNoiChangePct,
  formatNoiMargin,
  invoiceInRange,
  noiMarginToneClass,
  noiPriorChangePct,
  noiPriorRangeBounds,
  noiRangeBounds,
  parseNoiRange,
} from "@/lib/owner/noi-period";

export default async function OwnerNoiPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = parseNoiRange(params.range);
  const { start, end, label } = noiRangeBounds(range);
  const prior = noiPriorRangeBounds(range);

  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  const { data: properties, error: propertyError } = ownerId
    ? await supabase.from("properties").select("id, name").eq("owner_id", ownerId)
    : { data: [], error: ownerError ? { message: ownerError } : null };
  const propIds = (properties ?? []).map((p) => p.id);
  const placeholderId = "00000000-0000-0000-0000-000000000000";

  const [{ data: invoices }, { data: costs }] = await Promise.all([
    supabase
      .from("invoices")
      .select("property_id, total, status, party_type, period_end, due_date, issue_date")
      .in("property_id", propIds.length ? propIds : [placeholderId]),
    ownerId
      ? supabase
          .from("cost_entries")
          .select("property_id, amount, incurred_date")
          .eq("owner_id", ownerId)
      : Promise.resolve({ data: [] }),
  ]);

  function propertyNoi(propertyId: string, from: string, to: string) {
    const rev = (invoices ?? [])
      .filter(
        (i) =>
          i.property_id === propertyId &&
          i.party_type === "tenant" &&
          i.status !== "void" &&
          invoiceInRange(i, from, to)
      )
      .reduce((s, i) => s + Number(i.total), 0);
    const exp = (costs ?? [])
      .filter(
        (c) =>
          c.property_id === propertyId &&
          c.incurred_date >= from &&
          c.incurred_date <= to
      )
      .reduce((s, c) => s + Number(c.amount), 0);
    return { rev, exp, noi: rev - exp };
  }

  const rows = (properties ?? []).map((p) => {
    const current = propertyNoi(p.id, start, end);
    const priorNoi = propertyNoi(p.id, prior.start, prior.end).noi;
    const changePct = noiPriorChangePct(current.noi, priorNoi);
    return { ...p, ...current, priorNoi, changePct };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      rev: acc.rev + r.rev,
      exp: acc.exp + r.exp,
      noi: acc.noi + r.noi,
    }),
    { rev: 0, exp: 0, noi: 0 }
  );

  const detailQuery = range === "month" ? "" : `?range=${range}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Property NOI
        </h1>
        <NoiRangePills selected={range} basePath="/owner/noi" />
      </div>

      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{label}</span>
        {" · "}
        {start} → {end}
      </p>

      {propertyError ? (
        <p className="text-sm text-rose-700">{propertyError.message}</p>
      ) : null}

      <Card title="By property">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No property NOI to display yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Property</th>
                  <th className="py-2 pr-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Charges
                      <MetricInfoTip
                        label="Charges"
                        detail={METRIC_EXPLAINERS.charges}
                      />
                    </span>
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      OpEx
                      <MetricInfoTip
                        label="OpEx"
                        detail={METRIC_EXPLAINERS.opex}
                      />
                    </span>
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      NOI
                      <MetricInfoTip
                        label="NOI"
                        detail={METRIC_EXPLAINERS.periodNoi}
                      />
                    </span>
                  </th>
                  <th className="py-2 font-medium">
                    <span className="inline-flex items-center gap-1">
                      NOI Margin
                      <MetricInfoTip
                        label="NOI Margin"
                        detail={METRIC_EXPLAINERS.noiMargin}
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const negative = r.noi < 0;
                  const rowClass = negative
                    ? "border-b border-rose-100/80 border-l-4 border-l-rose-500 bg-rose-50/35 transition hover:bg-rose-50/55"
                    : "border-b border-slate-100 transition hover:bg-slate-50/80";
                  const change = r.changePct;
                  const up = change != null && change > 0.05;
                  const down = change != null && change < -0.05;

                  return (
                    <tr key={r.id} className={rowClass}>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/owner/noi/${r.id}${detailQuery}`}
                          className="font-medium text-[#0c1f2e] hover:text-[#c4784a] hover:underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        <Link
                          href={`/owner/noi/${r.id}${detailQuery}`}
                          className="block text-slate-800"
                        >
                          {formatMoney(r.rev)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        <Link
                          href={`/owner/noi/${r.id}${detailQuery}`}
                          className="block text-slate-800"
                        >
                          {formatMoney(r.exp)}
                        </Link>
                      </td>
                      <td
                        className={`py-2.5 pr-3 tabular-nums font-medium ${
                          negative ? "text-rose-700" : "text-[#0c1f2e]"
                        }`}
                      >
                        <Link
                          href={`/owner/noi/${r.id}${detailQuery}`}
                          className="inline-flex flex-wrap items-center gap-2"
                        >
                          <span>{formatMoney(r.noi)}</span>
                          {change == null ? (
                            <span
                              className="text-[11px] font-normal text-slate-400"
                              title="No prior-period baseline"
                            >
                              —
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                                up
                                  ? "bg-emerald-50 text-emerald-700"
                                  : down
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-500"
                              }`}
                              title={`vs prior NOI ${formatMoney(r.priorNoi)}`}
                            >
                              {up ? "↑" : down ? "↓" : "→"}
                              {formatNoiChangePct(change)}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td
                        className={`py-2.5 tabular-nums font-semibold ${noiMarginToneClass(
                          r.noi,
                          r.rev
                        )}`}
                      >
                        <Link
                          href={`/owner/noi/${r.id}${detailQuery}`}
                          className="block"
                        >
                          {formatNoiMargin(r.noi, r.rev)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#0c1f2e]/30 bg-[#0c1f2e] text-[#f3efe6]">
                  <td className="py-2.5 pr-3 font-medium">Totals</td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatMoney(totals.rev)}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatMoney(totals.exp)}</td>
                  <td
                    className={`py-2.5 pr-3 tabular-nums font-medium ${
                      totals.noi < 0 ? "text-rose-300" : ""
                    }`}
                  >
                    {formatMoney(totals.noi)}
                  </td>
                  <td
                    className={`py-2.5 tabular-nums font-semibold ${
                      totals.rev === 0
                        ? "text-slate-400"
                        : (totals.noi / totals.rev) * 100 >= 20
                          ? "text-emerald-300"
                          : totals.noi >= 0
                            ? "text-slate-200"
                            : (totals.noi / totals.rev) * 100 > -10
                              ? "text-amber-300"
                              : "text-rose-300"
                    }`}
                  >
                    {formatNoiMargin(totals.noi, totals.rev)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
