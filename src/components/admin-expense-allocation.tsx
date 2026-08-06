"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import {
  sumByCategory,
  sumByTaxTreatment,
  taxTreatmentClass,
  taxTreatmentLabel,
  type ExpenseAllocation,
  type ExpenseLine,
  type TaxTreatment,
} from "@/lib/expense-allocation";

function AllocationDetailDialog({
  allocation,
  lines,
  onClose,
}: {
  allocation: ExpenseAllocation;
  lines: ExpenseLine[];
  onClose: () => void;
}) {
  const titleId = useId();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [taxFilter, setTaxFilter] = useState<"all" | TaxTreatment>("all");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => [...new Set(lines.map((l) => l.category))].sort(),
    [lines]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return lines.filter((line) => {
      if (categoryFilter !== "all" && line.category !== categoryFilter) {
        return false;
      }
      if (taxFilter !== "all" && line.taxTreatment !== taxFilter) return false;
      if (!needle) return true;
      return [
        line.description,
        line.propertyName ?? "",
        line.ownerName ?? "",
        line.category,
        line.workOrderNumber ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [lines, categoryFilter, taxFilter, query]);

  const categoryTotals = sumByCategory(filtered);
  const total = filtered.reduce((s, l) => s + l.amount, 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const title =
    allocation === "owner"
      ? "Owner-allocated expenses"
      : "Company-allocated expenses";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0c1f2e]/55 p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close expense details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 mt-4 w-full max-w-4xl overflow-hidden rounded-lg border border-slate-800/10 bg-[#f4f1ea] shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0c1f2e] px-5 py-4 text-[#f3efe6]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#d4a574]">
              Expense detail
            </p>
            <h3
              id={titleId}
              className="font-[family-name:var(--font-display)] text-xl"
            >
              {title}
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Tax badges are advisory demo labels — they do not change remittance
              or owner tax filings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm md:col-span-1">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                Search
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Property, description, WO…"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#c4784a] focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm capitalize outline-none ring-[#c4784a] focus:ring-2"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                Tax treatment
              </span>
              <select
                value={taxFilter}
                onChange={(e) =>
                  setTaxFilter(e.target.value as "all" | TaxTreatment)
                }
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#c4784a] focus:ring-2"
              >
                <option value="all">All treatments</option>
                <option value="deductible_repair">Deductible</option>
                <option value="capital_improvement">Capitalizable</option>
                <option value="operating_recoverable">Operating</option>
                <option value="company_opex">Company OpEx</option>
                <option value="pending">Pending</option>
              </select>
            </label>
          </div>

          {categoryTotals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categoryTotals.slice(0, 6).map((c) => (
                <span
                  key={c.category}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700"
                >
                  <span className="capitalize">{c.category}</span>{" "}
                  <span className="font-medium tabular-nums">
                    {formatMoney(c.amount)}
                  </span>
                </span>
              ))}
              <span className="rounded-full bg-[#0c1f2e] px-3 py-1 text-xs text-[#f3efe6]">
                Showing {formatMoney(total)} · {filtered.length} lines
              </span>
            </div>
          ) : null}

          <div className="max-h-[55vh] overflow-auto rounded-md border border-slate-200 bg-white/70">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 border-b bg-[#f4f1ea] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  {allocation === "owner" ? (
                    <th className="px-3 py-2">Property</th>
                  ) : null}
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Tax treatment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {line.date}
                    </td>
                    {allocation === "owner" ? (
                      <td className="px-3 py-2">
                        <p className="font-medium text-[#0c1f2e]">
                          {line.propertyName ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {line.ownerName ?? "—"}
                          {line.workOrderNumber
                            ? ` · ${line.workOrderNumber}`
                            : ""}
                        </p>
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-[#0c1f2e]">
                      {line.description}
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-700">
                      {line.category}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatMoney(line.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${taxTreatmentClass(line.taxTreatment)}`}
                      >
                        {taxTreatmentLabel(line.taxTreatment)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={allocation === "owner" ? 6 : 5}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No expenses match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AdminExpenseAllocation({ lines }: { lines: ExpenseLine[] }) {
  const [open, setOpen] = useState<ExpenseAllocation | null>(null);

  const ownerLines = useMemo(
    () => lines.filter((l) => l.allocation === "owner"),
    [lines]
  );
  const companyLines = useMemo(
    () => lines.filter((l) => l.allocation === "company"),
    [lines]
  );

  const ownerTotal = ownerLines.reduce((s, l) => s + l.amount, 0);
  const companyTotal = companyLines.reduce((s, l) => s + l.amount, 0);
  const grand = ownerTotal + companyTotal;

  const ownerTax = sumByTaxTreatment(ownerLines);
  const deductible = ownerTax.get("deductible_repair") ?? 0;
  const capitalizable = ownerTax.get("capital_improvement") ?? 0;
  const pending = ownerTax.get("pending") ?? 0;

  const ownerTop = sumByCategory(ownerLines).slice(0, 3);
  const openLines = open === "owner" ? ownerLines : companyLines;

  return (
    <div className="space-y-6">
      {open ? (
        <AllocationDetailDialog
          allocation={open}
          lines={openLines}
          onClose={() => setOpen(null)}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Owner-allocated"
          value={formatMoney(ownerTotal)}
          hint={`${ownerLines.length} property cost lines`}
        />
        <Stat
          label="Company-allocated"
          value={formatMoney(companyTotal)}
          hint={`${companyLines.length} Harborline OpEx lines`}
        />
        <Stat
          label="Owner deductible (adv.)"
          value={formatMoney(deductible)}
          hint="Does not file owner taxes"
        />
        <Stat
          label="Owner capitalizable (adv.)"
          value={formatMoney(capitalizable)}
          hint={
            pending > 0 ? `${formatMoney(pending)} pending review` : "Advisory only"
          }
        />
      </div>

      <Card
        title="Allocation overview"
        action={
          <span className="text-sm text-slate-500">
            Total {formatMoney(grand)}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Allocated to</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Share</th>
                <th className="py-2 pr-3">Lines</th>
                <th className="py-2">Drill down</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 pr-3">
                  <button
                    type="button"
                    onClick={() => setOpen("owner")}
                    className="text-left font-medium text-[#0645ad] underline underline-offset-2 hover:text-[#0b57d0]"
                  >
                    Owner
                  </button>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Property ops costs (agency / charge-through)
                  </p>
                </td>
                <td className="py-3 pr-3 tabular-nums">
                  {formatMoney(ownerTotal)}
                </td>
                <td className="py-3 pr-3">
                  {grand > 0 ? `${((ownerTotal / grand) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="py-3 pr-3">{ownerLines.length}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpen("owner")}
                    className="rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
                  >
                    View details
                  </button>
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 pr-3">
                  <button
                    type="button"
                    onClick={() => setOpen("company")}
                    className="text-left font-medium text-[#0645ad] underline underline-offset-2 hover:text-[#0b57d0]"
                  >
                    Company
                  </button>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Harborline corporate operating expenses
                  </p>
                </td>
                <td className="py-3 pr-3 tabular-nums">
                  {formatMoney(companyTotal)}
                </td>
                <td className="py-3 pr-3">
                  {grand > 0
                    ? `${((companyTotal / grand) * 100).toFixed(1)}%`
                    : "—"}
                </td>
                <td className="py-3 pr-3">{companyLines.length}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpen("company")}
                    className="rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
                  >
                    View details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {ownerTop.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              Top owner categories
            </p>
            <div className="flex flex-wrap gap-2">
              {ownerTop.map((c) => (
                <span
                  key={c.category}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700"
                >
                  <span className="capitalize">{c.category}</span>{" "}
                  <span className="font-medium">{formatMoney(c.amount)}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
