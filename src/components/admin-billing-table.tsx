"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AdminInvoiceDocumentButton } from "@/app/admin/billing/invoice-document-button";
import { AdminBillingPaymentTimingChart } from "@/components/admin-billing-payment-timing-chart";
import { Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import {
  methodLabel,
  timingClass,
  timingLabel,
  type BillingInvoiceRow,
} from "@/lib/billing-payments";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2";

function InvoicePaymentDialog({
  invoice,
  onClose,
}: {
  invoice: BillingInvoiceRow;
  onClose: () => void;
}) {
  const titleId = useId();
  const balance = Math.max(invoice.total - invoice.amountPaid, 0);
  const overallTiming =
    invoice.payments.length === 0
      ? ("unpaid" as const)
      : invoice.payments.some((p) => p.timing === "late")
        ? ("late" as const)
        : invoice.payments.every((p) => p.timing === "early")
          ? ("early" as const)
          : ("on_time" as const);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0c1f2e]/55 p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close payment details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 mt-6 w-full max-w-lg overflow-hidden rounded-lg border border-slate-800/10 bg-[#f4f1ea] shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0c1f2e] px-5 py-4 text-[#f3efe6]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#d4a574]">
              Payment details
            </p>
            <h3
              id={titleId}
              className="font-[family-name:var(--font-display)] text-xl"
            >
              {invoice.invoiceNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="space-y-4 px-5 py-5 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Party
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">{invoice.partyName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="mt-0.5">
                <Badge status={invoice.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Issued
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">{invoice.issueDate}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Due
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">{invoice.dueDate}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Total / Paid
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">
                {formatMoney(invoice.total)} / {formatMoney(invoice.amountPaid)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Balance
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">{formatMoney(balance)}</dd>
            </div>
          </dl>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Timing
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${timingClass(overallTiming)}`}
            >
              {timingLabel(overallTiming)}
            </span>
          </div>

          {invoice.partyType === "tenant" ? (
            <div>
              <AdminInvoiceDocumentButton
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                className="w-full rounded border border-[#0c1f2e] px-3 py-2 text-left text-sm font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-white"
              />
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              How & when paid
            </p>
            {invoice.payments.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-white/70 px-3 py-3 text-slate-600">
                No payments have been applied to this invoice yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {invoice.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="rounded-md border border-slate-200 bg-white/80 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#0c1f2e]">
                          {methodLabel(payment.method)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.paymentNumber}
                          {payment.isAutoPay ? " · Auto-pay" : null}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${timingClass(payment.timing)}`}
                      >
                        {timingLabel(payment.timing)}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                      <div>
                        <span className="text-slate-500">Paid date: </span>
                        {payment.paymentDate}
                      </div>
                      <div>
                        <span className="text-slate-500">Applied: </span>
                        {formatMoney(payment.appliedAmount)}
                      </div>
                      {payment.reference ? (
                        <div className="sm:col-span-2">
                          <span className="text-slate-500">Reference: </span>
                          {payment.reference}
                        </div>
                      ) : null}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function AdminBillingTable({ invoices }: { invoices: BillingInvoiceRow[] }) {
  const [selected, setSelected] = useState<BillingInvoiceRow | null>(null);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState("all");
  const [datesQuery, setDatesQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [pdfFilter, setPdfFilter] = useState("all");

  const parties = useMemo(
    () =>
      [...new Set(invoices.map((invoice) => invoice.partyName))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [invoices]
  );

  const statuses = useMemo(
    () =>
      [...new Set(invoices.map((invoice) => invoice.status))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [invoices]
  );

  const rows = useMemo(() => {
    const invoiceNeedle = invoiceQuery.trim().toLowerCase();
    const datesNeedle = datesQuery.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (
        invoiceNeedle &&
        !invoice.invoiceNumber.toLowerCase().includes(invoiceNeedle)
      ) {
        return false;
      }
      if (partyFilter !== "all" && invoice.partyName !== partyFilter) {
        return false;
      }
      if (datesNeedle) {
        const haystack = `${invoice.issueDate} ${invoice.dueDate}`.toLowerCase();
        if (!haystack.includes(datesNeedle)) return false;
      }
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }

      const balance = Math.max(invoice.total - invoice.amountPaid, 0);
      if (balanceFilter === "open" && balance <= 0.009) return false;
      if (balanceFilter === "paid" && balance > 0.009) return false;

      if (pdfFilter === "available" && invoice.partyType !== "tenant") {
        return false;
      }
      if (pdfFilter === "none" && invoice.partyType === "tenant") {
        return false;
      }

      return true;
    });
  }, [
    invoices,
    invoiceQuery,
    partyFilter,
    datesQuery,
    statusFilter,
    balanceFilter,
    pdfFilter,
  ]);

  return (
    <div className="space-y-4">
      {selected ? (
        <InvoicePaymentDialog
          invoice={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}

      <AdminBillingPaymentTimingChart invoices={invoices} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Invoice
          </span>
          <input
            type="search"
            value={invoiceQuery}
            onChange={(event) => setInvoiceQuery(event.target.value)}
            placeholder="Invoice #"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Party
          </span>
          <select
            value={partyFilter}
            onChange={(event) => setPartyFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">All parties</option>
            {parties.map((party) => (
              <option key={party} value={party}>
                {party}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Dates
          </span>
          <input
            type="search"
            value={datesQuery}
            onChange={(event) => setDatesQuery(event.target.value)}
            placeholder="Issued or due date"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} capitalize`}
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Balance
          </span>
          <select
            value={balanceFilter}
            onChange={(event) => setBalanceFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">Any balance</option>
            <option value="open">Has balance</option>
            <option value="paid">Paid in full</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            PDF
          </span>
          <select
            value={pdfFilter}
            onChange={(event) => setPdfFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">Any</option>
            <option value="available">PDF available</option>
            <option value="none">No PDF</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">Invoice</th>
              <th className="py-2 pr-3">Party</th>
              <th className="py-2 pr-3">Dates</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Paid</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">PDF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => (
              <tr
                key={invoice.id}
                className="group border-b border-slate-100 transition-colors hover:bg-[#0c1f2e]/[0.03]"
              >
                <td className="py-3 pr-3 font-medium">
                  <button
                    type="button"
                    onClick={() => setSelected(invoice)}
                    className="inline-flex max-w-full items-center gap-1.5 text-left text-[#0645ad] underline underline-offset-2 transition-transform duration-200 ease-out group-hover:translate-x-1 hover:translate-x-1 hover:text-[#0b57d0] focus-visible:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4784a]/60"
                  >
                    <span className="truncate">{invoice.invoiceNumber}</span>
                    <span
                      aria-hidden
                      className="inline-block text-[#0645ad]/70 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                    >
                      ›
                    </span>
                  </button>
                </td>
                <td className="py-3 pr-3">{invoice.partyName}</td>
                <td className="py-3 pr-3 text-xs">
                  Issued {invoice.issueDate}
                  <br />
                  Due {invoice.dueDate}
                </td>
                <td className="py-3 pr-3">{formatMoney(invoice.total)}</td>
                <td className="py-3 pr-3">{formatMoney(invoice.amountPaid)}</td>
                <td className="py-3 pr-3">
                  <Badge status={invoice.status} />
                </td>
                <td className="py-3">
                  {invoice.partyType === "tenant" ? (
                    <AdminInvoiceDocumentButton
                      invoiceId={invoice.id}
                      invoiceNumber={invoice.invoiceNumber}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No invoices match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
