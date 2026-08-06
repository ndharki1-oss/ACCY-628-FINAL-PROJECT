import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { PropertyLink } from "@/components/property-link";
import { formatMoney } from "@/lib/utils";
import { fetchOwnerMyItems } from "@/lib/owner/my-items";
import {
  ownerApproveCost,
  ownerApproveWorkOrder,
  ownerReviewTenantRequest,
} from "@/app/actions/business";
import { OwnerDecisionActions } from "@/components/owner/owner-decision-actions";

export default async function OwnerMyItemsPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  if (!ownerId) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          My Items
        </h1>
        <p className="text-sm text-rose-700">
          {ownerError ?? "This login is not linked to an owner record."}
        </p>
      </div>
    );
  }

  const items = await fetchOwnerMyItems(supabase, ownerId);
  const expiring12 = items.expirations.filter((e) => e.window === "12 months")
    .length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          My Items
        </h1>
        {items.attentionCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 tabular-nums">
              {items.attentionCount}
            </span>
            need attention
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
            All clear
          </span>
        )}
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-slate-200 bg-white/80 px-4 py-3 sm:grid-cols-4">
        <SummaryStat label="Decisions" value={items.decisionCount} hot />
        <SummaryStat
          label="Overdue rent"
          value={items.overdueInvoices.length}
          hot
        />
        <SummaryStat label="Expiring ≤12 mo" value={expiring12} />
        <SummaryStat label="Watch list" value={items.expirations.length} />
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-amber-950">
          Needs Attention
        </h2>

        <Card title="Costs awaiting approval">
          <p className="mb-3 text-xs text-slate-500">
            Decisions and the nav badge count only costs over the property
            approval threshold (same as property Actions). Below-threshold
            items still appear here for awareness.
          </p>
          {items.costs.length === 0 ? (
            <p className="text-sm text-slate-600">No unapproved costs.</p>
          ) : (
            <ul className="space-y-4">
              {items.costs.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-lg border p-4 ${
                    c.overThreshold
                      ? "border-amber-300 bg-amber-50/70"
                      : "border-slate-200 bg-white/80"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-[#0c1f2e]">{c.description}</p>
                      <p className="text-sm text-slate-600">
                        <PropertyLink
                          id={c.property_id}
                          className="text-slate-700 hover:text-[#c4784a] hover:underline"
                        >
                          {c.property_name}
                        </PropertyLink>{" "}
                        · {c.category} · {c.incurred_date}
                      </p>
                      <p className="text-xs text-slate-500">
                        Threshold {formatMoney(c.threshold)}
                        {c.overThreshold ? " · exceeds threshold" : ""}
                      </p>
                    </div>
                    <p className="font-[family-name:var(--font-display)] text-xl tabular-nums text-[#0c1f2e]">
                      {formatMoney(c.amount)}
                    </p>
                  </div>
                  <OwnerDecisionActions
                    id={c.id}
                    action={ownerApproveCost}
                    denyDecision="deny"
                    denyOpenLabel="Deny…"
                    denyConfirmLabel="Confirm deny"
                    reasonName="reason"
                    reasonRequired
                    reasonLabel="Why are you denying this cost?"
                    reasonPlaceholder="Note for Harborline management…"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Work orders over threshold">
          {items.workOrders.length === 0 ? (
            <p className="text-sm text-slate-600">
              No work orders waiting on your approval.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.workOrders.map((w) => (
                <li key={w.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#0c1f2e]">
                        {w.wo_number}: {w.title}
                      </p>
                      <p className="text-slate-600">
                        <PropertyLink
                          id={w.property_id}
                          className="text-slate-700 hover:text-[#c4784a] hover:underline"
                        >
                          {w.property_name}
                        </PropertyLink>{" "}
                        · estimate {formatMoney(w.estimated_cost || w.actual_cost)}
                      </p>
                      {w.description ? (
                        <p className="mt-1 text-xs text-slate-500">{w.description}</p>
                      ) : null}
                      {w.vendor_notes ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Notes: {w.vendor_notes}
                        </p>
                      ) : null}
                    </div>
                    <Badge status={w.status} />
                  </div>
                  <OwnerDecisionActions
                    id={w.id}
                    action={ownerApproveWorkOrder}
                    denyDecision="reject"
                    denyOpenLabel="Decline…"
                    denyConfirmLabel="Confirm decline"
                    reasonName="reason"
                    reasonRequired
                    reasonLabel="Why are you declining?"
                    reasonPlaceholder="Note for Harborline management…"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Open tenant / maintenance requests"
          action={
            <Link
              href="/owner/reports/maintenance"
              className="text-sm text-[#c4784a]"
            >
              Cost report →
            </Link>
          }
        >
          {items.requests.length === 0 ? (
            <p className="text-sm text-slate-600">No open tenant requests.</p>
          ) : (
            <ul className="space-y-4">
              {items.requests.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#0c1f2e]">{r.title}</p>
                      <p className="text-sm text-slate-600">
                        <PropertyLink
                          id={r.property_id}
                          className="text-slate-700 hover:text-[#c4784a] hover:underline"
                        >
                          {r.property_name}
                        </PropertyLink>{" "}
                        · {r.tenant_name}
                      </p>
                      {r.description ? (
                        <p className="mt-2 text-sm text-slate-600">{r.description}</p>
                      ) : null}
                    </div>
                    <Badge status={r.status} />
                  </div>
                  <OwnerDecisionActions
                    id={r.id}
                    action={ownerReviewTenantRequest}
                    denyDecision="decline"
                    denyOpenLabel="Decline…"
                    denyConfirmLabel="Confirm decline"
                    reasonName="notes"
                    reasonRequired={false}
                    reasonLabel="Why are you declining?"
                    reasonPlaceholder="Optional note for Harborline…"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <Card title="Overdue rent">
          {items.overdueInvoices.length === 0 ? (
            <p className="text-sm text-slate-600">No overdue invoices.</p>
          ) : (
            <ul className="space-y-3">
              {items.overdueInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[#0c1f2e]">{inv.tenant_name}</p>
                    <p className="text-slate-600">
                      <PropertyLink
                        id={inv.property_id}
                        className="text-slate-700 hover:text-[#c4784a] hover:underline"
                      >
                        {inv.property_name}
                      </PropertyLink>
                      {" · due "}
                      {inv.due_date}
                      {inv.period_start && inv.period_end
                        ? ` · ${inv.period_start} → ${inv.period_end}`
                        : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-[family-name:var(--font-display)] text-lg tabular-nums text-rose-900">
                      {formatMoney(inv.balance)}
                    </p>
                    <Badge status="overdue" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming lease expirations">
          {items.expirations.length === 0 ? (
            <p className="text-sm text-slate-600">
              No expirations in the next 24 months.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.expirations.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-[#0c1f2e]">{l.tenant_name}</p>
                    <p className="text-sm text-slate-600">
                      <PropertyLink
                        id={l.property_id}
                        className="text-slate-700 hover:text-[#c4784a] hover:underline"
                      >
                        {l.property_name}
                      </PropertyLink>{" "}
                      · ends {l.end_date}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      l.window === "12 months"
                        ? "bg-rose-100 text-rose-800"
                        : l.window === "18 months"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {l.monthsLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hot,
}: {
  label: string;
  value: number;
  hot?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`font-[family-name:var(--font-display)] text-xl tabular-nums leading-tight ${
          hot && value > 0 ? "text-rose-700" : "text-[#0c1f2e]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
