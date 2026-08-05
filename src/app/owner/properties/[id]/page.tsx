import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import {
  ownerApproveCost,
  ownerApproveWorkOrder,
  ownerReviewTenantRequest,
} from "@/app/actions/business";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatSqFt(n: number | null | undefined) {
  if (!n) return "—";
  return `${Number(n).toLocaleString()} sq ft`;
}

function standingForLease(
  leaseId: string,
  invoices: { lease_id: string | null; status: string }[]
) {
  const rows = invoices.filter((i) => i.lease_id === leaseId);
  if (rows.some((i) => i.status === "overdue")) return "overdue";
  if (rows.some((i) => i.status === "disputed")) return "disputed";
  if (rows.some((i) => i.status === "partial")) return "partial";
  if (rows.some((i) => i.status === "sent")) return "sent";
  if (rows.length === 0) return "current";
  if (rows.every((i) => i.status === "paid" || i.status === "void")) return "paid";
  return rows[0]?.status ?? "current";
}

export default async function OwnerPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  if (!ownerId) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Property
        </h1>
        <p className="text-sm text-rose-700">
          {ownerError ?? "This login is not linked to an owner record."}
        </p>
      </div>
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select(
      "id, name, address_line1, city, state, postal_code, property_type, square_feet, status, management_agreements(fee_percent, approval_threshold, start_date, end_date, status, notes)"
    )
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!property) notFound();

  const agreement = firstRel(property.management_agreements);
  const threshold = Number(agreement?.approval_threshold ?? 2500);

  const [
    { data: units },
    { data: leases },
    { data: invoices },
    { data: deposits },
    { data: costs },
    { data: workOrders },
    { data: requests },
    { data: deniedApprovals },
  ] = await Promise.all([
    supabase
      .from("units")
      .select("id, unit_code, floor, square_feet")
      .eq("property_id", property.id)
      .order("unit_code"),
    supabase
      .from("leases")
      .select(
        "id, unit_id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, security_deposit_required, tenants(company_name, contact_name, email, phone)"
      )
      .eq("property_id", property.id)
      .order("lease_number"),
    supabase
      .from("invoices")
      .select("id, lease_id, tenant_id, status, total, amount_paid, due_date")
      .eq("party_type", "tenant")
      .eq("property_id", property.id),
    supabase
      .from("security_deposits")
      .select("id, lease_id, amount, status")
      .eq("property_id", property.id),
    supabase
      .from("cost_entries")
      .select("id, description, amount, category, incurred_date, owner_approved")
      .eq("owner_id", ownerId)
      .eq("property_id", property.id)
      .order("incurred_date", { ascending: false }),
    supabase
      .from("work_orders")
      .select(
        "id, wo_number, title, status, actual_cost, estimated_cost, vendor_notes, scheduled_date"
      )
      .eq("property_id", property.id)
      .eq("status", "pending_owner_approval"),
    supabase
      .from("tenant_requests")
      .select(
        "id, title, description, status, created_at, tenants(company_name, contact_name)"
      )
      .eq("property_id", property.id)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select("entity_id")
      .eq("entity_type", "cost_entry")
      .eq("status", "rejected"),
  ]);

  const tenantInvoices = (invoices ?? []).filter((i) => i.status !== "void");
  const deniedCostIds = new Set((deniedApprovals ?? []).map((a) => a.entity_id));
  const activeLeases = (leases ?? []).filter((l) =>
    ["active", "renewal_pending"].includes(l.status)
  );
  const leasedUnitIds = new Set(activeLeases.map((l) => l.unit_id).filter(Boolean));
  const occupancyPct =
    (units ?? []).length > 0
      ? Math.round((leasedUnitIds.size / (units ?? []).length) * 100)
      : 0;
  const monthlyRent = activeLeases.reduce(
    (s, l) => s + Number(l.base_rent_monthly) + Number(l.cam_monthly),
    0
  );
  const overdueTenants = new Set(
    tenantInvoices.filter((i) => i.status === "overdue").map((i) => i.tenant_id)
  );
  const heldDeposits = (deposits ?? []).filter((d) => d.status === "held");
  const awaitingCosts = (costs ?? []).filter((c) => {
    if (c.owner_approved || deniedCostIds.has(c.id)) return false;
    return Number(c.amount) > threshold;
  });

  const unitById = new Map((units ?? []).map((u) => [u.id, u]));
  const depositByLease = new Map(
    heldDeposits.map((d) => [d.lease_id, Number(d.amount)])
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/owner/properties" className="text-sm text-[#c4784a]">
          ← All properties
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e] sm:text-4xl">
              {property.name}
            </h1>
            <p className="mt-2 text-slate-600">
              {property.address_line1}, {property.city}, {property.state}{" "}
              {property.postal_code}
            </p>
          </div>
          <Badge status={property.status} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Occupancy"
          value={`${occupancyPct}%`}
          hint={`${leasedUnitIds.size} leased · ${(units ?? []).length - leasedUnitIds.size} vacant`}
        />
        <Stat
          label="In-place monthly rent"
          value={formatMoney(monthlyRent)}
          hint={`${activeLeases.length} active lease${activeLeases.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Delinquent tenants"
          value={String(overdueTenants.size)}
          hint="Tenants with overdue invoices"
        />
        <Stat
          label="Deposits held"
          value={formatMoney(heldDeposits.reduce((s, d) => s + Number(d.amount), 0))}
          hint={`${heldDeposits.length} escrow deposit${heldDeposits.length === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Property details">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
              <dd className="mt-1 capitalize">{property.property_type.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Size</dt>
              <dd className="mt-1">{formatSqFt(property.square_feet)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
              <dd className="mt-1 capitalize">{property.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Units</dt>
              <dd className="mt-1">{(units ?? []).length}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Management agreement">
          {agreement ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Fee</dt>
                <dd className="mt-1">{agreement.fee_percent}% of collected rent</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Approval threshold
                </dt>
                <dd className="mt-1">{formatMoney(agreement.approval_threshold)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Term</dt>
                <dd className="mt-1">
                  {agreement.start_date}
                  {agreement.end_date ? ` → ${agreement.end_date}` : " → open"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Agreement</dt>
                <dd className="mt-1">
                  <Badge status={agreement.status} />
                </dd>
              </div>
              {agreement.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Notes</dt>
                  <dd className="mt-1 text-slate-600">{agreement.notes}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm text-slate-600">No management agreement is on file.</p>
          )}
        </Card>
      </div>

      <Card title="Units">
        {(units ?? []).length === 0 ? (
          <p className="text-sm text-slate-600">No units are recorded for this property.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">Unit</th>
                  <th className="py-3 pr-4 font-medium">Floor</th>
                  <th className="py-3 pr-4 font-medium">Size</th>
                  <th className="py-3 pr-4 font-medium">Occupancy</th>
                  <th className="py-3 font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody>
                {(units ?? []).map((unit) => {
                  const lease = activeLeases.find((l) => l.unit_id === unit.id);
                  const tenant = firstRel(lease?.tenants);
                  return (
                    <tr key={unit.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-[#0c1f2e]">{unit.unit_code}</td>
                      <td className="py-3 pr-4 text-slate-600">{unit.floor || "—"}</td>
                      <td className="py-3 pr-4">{formatSqFt(unit.square_feet)}</td>
                      <td className="py-3 pr-4">
                        <Badge status={lease ? "leased" : "vacant"} />
                      </td>
                      <td className="py-3 text-slate-600">
                        {tenant?.company_name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Tenants">
        <p className="mb-5 text-sm leading-relaxed text-slate-600">
          High-level lease and payment standing for tenants on this property.
        </p>
        {activeLeases.length === 0 ? (
          <p className="text-sm text-slate-600">No active tenants on this property.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 font-medium">Unit / lease</th>
                  <th className="py-3 pr-4 font-medium">Term</th>
                  <th className="py-3 pr-4 font-medium">Monthly</th>
                  <th className="py-3 pr-4 font-medium">Deposit</th>
                  <th className="py-3 font-medium">Standing</th>
                </tr>
              </thead>
              <tbody>
                {activeLeases.map((lease) => {
                  const tenant = firstRel(lease.tenants);
                  const unit = lease.unit_id ? unitById.get(lease.unit_id) : null;
                  const standing = standingForLease(lease.id, tenantInvoices);
                  return (
                    <tr key={lease.id} className="border-b border-slate-100">
                      <td className="py-4 pr-4">
                        <p className="font-medium text-[#0c1f2e]">
                          {tenant?.company_name ?? "Tenant"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tenant?.contact_name}
                          {tenant?.email ? ` · ${tenant.email}` : ""}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <p>{unit?.unit_code ?? "—"}</p>
                        <p className="text-xs text-slate-500">
                          {lease.lease_number} · {lease.lease_type.replaceAll("_", " ")}
                        </p>
                      </td>
                      <td className="py-4 pr-4 text-slate-600">
                        {lease.start_date} → {lease.end_date}
                        <p className="text-xs capitalize text-slate-500">
                          {lease.status.replaceAll("_", " ")}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        {formatMoney(
                          Number(lease.base_rent_monthly) + Number(lease.cam_monthly)
                        )}
                        <p className="text-xs text-slate-500">
                          rent {formatMoney(lease.base_rent_monthly)} + CAM{" "}
                          {formatMoney(lease.cam_monthly)}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        {formatMoney(
                          depositByLease.get(lease.id) ?? lease.security_deposit_required
                        )}
                        <p className="text-xs text-slate-500">
                          {depositByLease.has(lease.id) ? "held in escrow" : "required"}
                        </p>
                      </td>
                      <td className="py-4">
                        <Badge status={standing} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Actions for this property
        </h2>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Spend awaiting approval">
            <p className="mb-4 text-sm text-slate-600">
              Costs above your {formatMoney(threshold)} threshold.
            </p>
            {awaitingCosts.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing is waiting on you.</p>
            ) : (
              <ul className="space-y-4">
                {awaitingCosts.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#0c1f2e]">{c.description}</p>
                        <p className="text-sm text-slate-600">
                          {c.category} · {c.incurred_date}
                        </p>
                      </div>
                      <p className="text-lg font-semibold">{formatMoney(c.amount)}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={ownerApproveCost}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button
                          type="submit"
                          className="rounded bg-emerald-700 px-3 py-2 text-sm text-white"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={ownerApproveCost} className="flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="decision" value="deny" />
                        <input
                          name="reason"
                          placeholder="Denial reason"
                          className="rounded border border-slate-300 px-3 py-2 text-sm"
                          required
                        />
                        <button
                          type="submit"
                          className="rounded bg-rose-700 px-3 py-2 text-sm text-white"
                        >
                          Deny
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Work order completions">
            {(workOrders ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">No vendor completions waiting.</p>
            ) : (
              <ul className="space-y-4">
                {(workOrders ?? []).map((w) => (
                  <li key={w.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {w.wo_number}: {w.title}
                        </p>
                        <p className="text-slate-600">
                          Claimed cost {formatMoney(w.actual_cost || w.estimated_cost)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Vendor notes: {w.vendor_notes || "—"}
                        </p>
                      </div>
                      <Badge status={w.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={ownerApproveWorkOrder}>
                        <input type="hidden" name="id" value={w.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button
                          type="submit"
                          className="rounded bg-emerald-700 px-3 py-1.5 text-white"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={ownerApproveWorkOrder} className="flex gap-2">
                        <input type="hidden" name="id" value={w.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <input
                          name="reason"
                          placeholder="Rejection reason"
                          className="rounded border px-2 py-1"
                          required
                        />
                        <button
                          type="submit"
                          className="rounded bg-rose-700 px-3 py-1.5 text-white"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Open tenant requests">
          {(requests ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No open tenant requests.</p>
          ) : (
            <ul className="space-y-4">
              {(requests ?? []).map((r) => {
                const tenant = firstRel(r.tenants);
                return (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#0c1f2e]">{r.title}</p>
                        <p className="text-sm text-slate-600">
                          {tenant?.company_name ?? "Tenant"}
                          {tenant?.contact_name ? ` · ${tenant.contact_name}` : ""}
                        </p>
                        {r.description ? (
                          <p className="mt-2 text-sm text-slate-600">{r.description}</p>
                        ) : null}
                      </div>
                      <Badge status={r.status} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={ownerReviewTenantRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button
                          type="submit"
                          className="rounded bg-emerald-700 px-3 py-2 text-sm text-white"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={ownerReviewTenantRequest} className="flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="decline" />
                        <input
                          name="notes"
                          placeholder="Notes (optional)"
                          className="rounded border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded bg-rose-700 px-3 py-2 text-sm text-white"
                        >
                          Decline
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
