import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Card } from "@/components/ui";
import { MetricInfoTip } from "@/components/owner/metric-info-tip";
import { NoiRangePills } from "@/components/owner/noi-range-pills";
import { NoiPropertyTrendChart } from "@/components/owner/noi-property-trend";
import { NoiMixBars } from "@/components/owner/noi-mix-bars";
import type { NoiMonthPoint } from "@/components/owner/noi-trend-chart";
import { formatMoney } from "@/lib/utils";
import { METRIC_EXPLAINERS } from "@/lib/owner/metric-explainers";
import {
  classifyIncomeLine,
  formatNoiMargin,
  invoiceInRange,
  lastNMonthKeys,
  monthBounds,
  monthLabel,
  noiRangeBounds,
  parseNoiRange,
} from "@/lib/owner/noi-period";

type ExpenseLine = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  source: "cost" | "labor";
};

export default async function OwnerNoiPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const range = parseNoiRange((await searchParams).range);
  const { start, end, label } = noiRangeBounds(range);

  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  if (!ownerId) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Property NOI
        </h1>
        <p className="text-sm text-rose-700">
          {ownerError ?? "This login is not linked to an owner record."}
        </p>
      </div>
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, address_line1, city, state")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!property) notFound();

  const [{ data: invoices }, { data: costs }, { data: labor }, { data: statements }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, total, status, party_type, period_end, due_date, issue_date, invoice_lines(line_type, amount)"
        )
        .eq("property_id", property.id)
        .eq("party_type", "tenant"),
      supabase
        .from("cost_entries")
        .select("id, category, description, amount, incurred_date")
        .eq("owner_id", ownerId)
        .eq("property_id", property.id)
        .order("incurred_date", { ascending: false }),
      supabase
        .from("labor_time_entries")
        .select("id, labor_cost, notes, work_date, hours")
        .eq("property_id", property.id)
        .order("work_date", { ascending: false }),
      supabase
        .from("owner_statements")
        .select("management_fee, period_start, period_end, status")
        .eq("owner_id", ownerId)
        .eq("property_id", property.id),
    ]);

  const tenantInvoices = (invoices ?? []).filter((i) => i.status !== "void");
  const rangeInvoices = tenantInvoices.filter((i) =>
    invoiceInRange(i, start, end)
  );
  const rangeCosts = (costs ?? []).filter(
    (c) => c.incurred_date >= start && c.incurred_date <= end
  );
  const rangeLabor = (labor ?? []).filter(
    (l) => l.work_date >= start && l.work_date <= end
  );

  let rentIncome = 0;
  let otherIncome = 0;
  let chargesFromLines = 0;

  for (const inv of rangeInvoices) {
    const lines =
      (inv.invoice_lines as { line_type: string; amount: number }[] | null) ??
      [];
    if (lines.length === 0) {
      otherIncome += Number(inv.total);
      continue;
    }
    for (const line of lines) {
      const amt = Number(line.amount);
      chargesFromLines += amt;
      if (classifyIncomeLine(line.line_type) === "rent") rentIncome += amt;
      else otherIncome += amt;
    }
  }

  const incomeTotal =
    chargesFromLines > 0
      ? rentIncome + otherIncome
      : rangeInvoices.reduce((s, i) => s + Number(i.total), 0);
  if (chargesFromLines === 0) {
    otherIncome = incomeTotal;
    rentIncome = 0;
  }

  const expenseLines: ExpenseLine[] = [
    ...rangeCosts.map((c) => ({
      id: c.id,
      category: String(c.category),
      description: c.description,
      amount: Number(c.amount),
      date: c.incurred_date,
      source: "cost" as const,
    })),
    ...rangeLabor.map((l) => ({
      id: l.id,
      category: "labor",
      description: l.notes
        ? `${l.notes} (${Number(l.hours)} hrs)`
        : `Labor (${Number(l.hours)} hrs)`,
      amount: Number(l.labor_cost),
      date: l.work_date,
      source: "labor" as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);

  const opexByCategory = new Map<string, number>();
  for (const line of expenseLines) {
    opexByCategory.set(
      line.category,
      (opexByCategory.get(line.category) ?? 0) + line.amount
    );
  }
  const opexRows = [...opexByCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const opexTotal = opexRows.reduce((s, r) => s + r.amount, 0);
  const noi = incomeTotal - opexTotal;
  const marginLabel = formatNoiMargin(noi, incomeTotal);

  const managementFee = (statements ?? [])
    .filter((s) => s.period_end >= start && s.period_start <= end)
    .reduce((s, st) => s + Number(st.management_fee), 0);

  const monthKeys = lastNMonthKeys(6);
  const months: NoiMonthPoint[] = monthKeys.map((key) => {
    const { start: ms, end: me } = monthBounds(key);
    const income = tenantInvoices
      .filter((i) => invoiceInRange(i, ms, me))
      .reduce((s, i) => s + Number(i.total), 0);
    const costExp = (costs ?? [])
      .filter((c) => c.incurred_date >= ms && c.incurred_date <= me)
      .reduce((s, c) => s + Number(c.amount), 0);
    const laborExp = (labor ?? [])
      .filter((l) => l.work_date >= ms && l.work_date <= me)
      .reduce((s, l) => s + Number(l.labor_cost), 0);
    const expense = costExp + laborExp;
    return {
      key,
      label: monthLabel(key),
      income,
      expense,
      noi: income - expense,
    };
  });

  const listHref = range === "month" ? "/owner/noi" : `/owner/noi?range=${range}`;
  const detailBase = `/owner/noi/${property.id}`;

  const linesByCategory = new Map<string, ExpenseLine[]>();
  for (const line of expenseLines) {
    const list = linesByCategory.get(line.category) ?? [];
    list.push(line);
    linesByCategory.set(line.category, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={listHref} className="text-sm text-[#c4784a] hover:underline">
          ← All properties NOI
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#0c1f2e] sm:text-4xl">
              {property.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {property.address_line1}, {property.city}, {property.state}
            </p>
          </div>
          <NoiRangePills selected={range} basePath={detailBase} />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Period: <span className="font-medium text-slate-700">{label}</span>
          {" · "}
          {start} → {end}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/70">
            Revenue
            <MetricInfoTip
              label="Revenue"
              detail={METRIC_EXPLAINERS.charges}
            />
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums text-emerald-950">
            {formatMoney(incomeTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-900/70">
            OpEx
            <MetricInfoTip
              label="OpEx"
              detail={METRIC_EXPLAINERS.opex}
            />
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums text-amber-950">
            {formatMoney(opexTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800/15 bg-[#0c1f2e] px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            NOI
            <MetricInfoTip
              label="NOI"
              detail={METRIC_EXPLAINERS.periodNoi}
              tone="dark"
            />
          </p>
          <p
            className={`mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums ${
              noi < 0 ? "text-rose-300" : "text-[#f3efe6]"
            }`}
          >
            {formatMoney(noi)}
          </p>
        </div>
        <div className="rounded-lg border border-[#e3c4ad] bg-[#f7eee6] px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a5a3a]">
            NOI margin
            <MetricInfoTip
              label="NOI margin"
              detail={METRIC_EXPLAINERS.noiMargin}
            />
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums text-[#6b3f28]">
            {marginLabel}
          </p>
          <p className="mt-1 text-xs text-[#8a5a3a]/90">NOI ÷ revenue</p>
        </div>
      </div>

      <Card title="NOI trend (last 6 months)">
        <NoiPropertyTrendChart months={months} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Income mix">
          <NoiMixBars
            items={[
              { label: "Rent / tenant charges", amount: rentIncome },
              { label: "Other income (CAM, fees, etc.)", amount: otherIncome },
            ]}
            emptyLabel="No income in this period."
          />
          {chargesFromLines === 0 && incomeTotal > 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              Line-level rent vs other is unavailable for some invoices; totals
              use invoice headers.
            </p>
          ) : null}
        </Card>

        <Card title="OpEx mix by category">
          <NoiMixBars
            items={opexRows.map((r) => ({
              label: r.category.replaceAll("_", " "),
              amount: r.amount,
            }))}
            emptyLabel="No operating costs in this period."
          />
        </Card>
      </div>

      <Card title="NOI calculation">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">Revenue (income total)</span>
            <span className="tabular-nums font-medium">
              {formatMoney(incomeTotal)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">− Operating expenses</span>
            <span className="tabular-nums font-medium">
              {formatMoney(opexTotal)}
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-3">
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
                = NOI
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Margin{" "}
                <span className="font-semibold text-[#6b3f28]">{marginLabel}</span>
              </p>
            </div>
            <p
              className={`font-[family-name:var(--font-display)] text-3xl tabular-nums ${
                noi < 0 ? "text-rose-700" : "text-[#0c1f2e]"
              }`}
            >
              {formatMoney(noi)}
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-[#e3c4ad] bg-[#f7eee6] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a5a3a]">
              Management fee (not in OpEx)
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums text-[#6b3f28]">
              {formatMoney(managementFee)}
            </p>
            <p className="mt-1 text-xs text-[#8a5a3a]/90">
              Harborline fee from owner statements overlapping this period.
              Shown separately so NOI reflects property performance.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Expense detail">
        {expenseLines.length === 0 ? (
          <p className="text-sm text-slate-600">
            No expense line items in this period.
          </p>
        ) : (
          <div className="space-y-6">
            {[...linesByCategory.entries()]
              .sort((a, b) => {
                const sumA = a[1].reduce((s, l) => s + l.amount, 0);
                const sumB = b[1].reduce((s, l) => s + l.amount, 0);
                return sumB - sumA;
              })
              .map(([category, lines]) => {
                const catTotal = lines.reduce((s, l) => s + l.amount, 0);
                return (
                  <div key={category}>
                    <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2">
                      <h3 className="text-sm font-semibold capitalize text-[#0c1f2e]">
                        {category.replaceAll("_", " ")}
                      </h3>
                      <p className="text-sm font-semibold tabular-nums text-[#0c1f2e]">
                        {formatMoney(catTotal)}
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {lines.map((line) => (
                        <li
                          key={`${line.source}-${line.id}`}
                          className="flex flex-wrap items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-800">{line.description}</p>
                            <p className="text-xs text-slate-500">
                              {line.date}
                              {line.source === "labor" ? " · time entry" : ""}
                            </p>
                          </div>
                          <p className="shrink-0 tabular-nums font-medium text-[#0c1f2e]">
                            {formatMoney(line.amount)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
}
