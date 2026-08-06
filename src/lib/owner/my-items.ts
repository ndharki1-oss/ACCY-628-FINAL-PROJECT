import type { SupabaseClient } from "@supabase/supabase-js";

const emptyId = "00000000-0000-0000-0000-000000000000";

export type OwnerMyItemsData = {
  costs: {
    id: string;
    property_id: string;
    property_name: string;
    description: string;
    amount: number;
    category: string;
    incurred_date: string;
    threshold: number;
    overThreshold: boolean;
  }[];
  workOrders: {
    id: string;
    property_id: string;
    property_name: string;
    wo_number: string;
    title: string;
    description: string | null;
    estimated_cost: number;
    actual_cost: number;
    vendor_notes: string | null;
    status: string;
  }[];
  requests: {
    id: string;
    property_id: string;
    property_name: string;
    title: string;
    description: string | null;
    status: string;
    created_at: string;
    tenant_name: string;
  }[];
  overdueInvoices: {
    id: string;
    property_id: string;
    property_name: string;
    tenant_name: string;
    due_date: string;
    period_start: string | null;
    period_end: string | null;
    balance: number;
  }[];
  expirations: {
    id: string;
    property_id: string;
    property_name: string;
    tenant_name: string;
    end_date: string;
    /** Urgency bucket used for badges / attention counts */
    window: "12 months" | "18 months" | "24 months";
    /** Actual remaining time label, e.g. "3 months" */
    monthsLabel: string;
    monthsRemaining: number;
  }[];
  /** Nav badge: decisions + overdue + 12-month expirations */
  attentionCount: number;
  decisionCount: number;
};

function unwrapName(
  rel: { name?: string; company_name?: string } | { name?: string; company_name?: string }[] | null
) {
  if (!rel) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.name ?? row?.company_name ?? null;
}

function inMonthsFrom(now: Date, months: number) {
  const d = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
  return d.toISOString().slice(0, 10);
}

function expirationWindow(
  endDate: string,
  within12: string,
  within18: string
): "12 months" | "18 months" | "24 months" {
  if (endDate <= within12) return "12 months";
  if (endDate <= within18) return "18 months";
  return "24 months";
}

/** Round remaining calendar span to whole months for display (never uses bucket labels). */
export function monthsUntilLeaseEnd(endDateIso: string, from = new Date()) {
  const end = new Date(`${endDateIso}T12:00:00`);
  if (Number.isNaN(end.getTime())) {
    return { monthsRemaining: 0, monthsLabel: "—" };
  }
  const start = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    12,
    0,
    0
  );
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) {
    return { monthsRemaining: 0, monthsLabel: "Expired" };
  }
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days < 30) {
    return {
      monthsRemaining: 0,
      monthsLabel: days === 1 ? "1 day" : `${days} days`,
    };
  }
  const monthsRemaining = Math.max(1, Math.round(days / 30.437));
  return {
    monthsRemaining,
    monthsLabel:
      monthsRemaining === 1 ? "1 month" : `${monthsRemaining} months`,
  };
}

export async function fetchOwnerMyItems(
  supabase: SupabaseClient,
  ownerId: string
): Promise<OwnerMyItemsData> {
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("owner_id", ownerId);
  const propIds = (properties ?? []).map((p) => p.id);
  const propFilter = propIds.length ? propIds : [emptyId];
  const propertyName = (id: string) =>
    (properties ?? []).find((p) => p.id === id)?.name ?? "Property";

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const within12 = inMonthsFrom(now, 12);
  const within18 = inMonthsFrom(now, 18);
  const within24 = inMonthsFrom(now, 24);

  const [
    { data: agreements },
    { data: costs },
    { data: wos },
    { data: requests },
    { data: invoices },
    { data: leases },
    { data: deniedApprovals },
  ] = await Promise.all([
    supabase
      .from("management_agreements")
      .select("property_id, approval_threshold")
      .eq("owner_id", ownerId),
    supabase
      .from("cost_entries")
      .select(
        "id, property_id, description, amount, category, incurred_date, owner_approved, properties(name)"
      )
      .eq("owner_id", ownerId)
      .eq("owner_approved", false),
    supabase
      .from("work_orders")
      .select(
        "id, property_id, wo_number, title, description, vendor_notes, estimated_cost, actual_cost, status, properties(name)"
      )
      .in("property_id", propFilter)
      .eq("status", "pending_owner_approval"),
    supabase
      .from("tenant_requests")
      .select(
        "id, property_id, title, description, status, created_at, tenants(company_name), properties(name)"
      )
      .in("property_id", propFilter)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select(
        "id, property_id, tenant_id, status, total, amount_paid, due_date, period_start, period_end, tenants(company_name), properties(name)"
      )
      .eq("party_type", "tenant")
      .in("property_id", propFilter)
      .eq("status", "overdue"),
    supabase
      .from("leases")
      .select(
        "id, property_id, status, end_date, tenants(company_name), properties(name)"
      )
      .in("property_id", propFilter)
      .in("status", ["active", "renewal_pending"]),
    supabase
      .from("approvals")
      .select("entity_id")
      .eq("entity_type", "cost_entry")
      .eq("status", "rejected"),
  ]);

  const thresholdByProperty = new Map(
    (agreements ?? []).map((a) => [a.property_id, Number(a.approval_threshold)])
  );
  const deniedCostIds = new Set((deniedApprovals ?? []).map((a) => a.entity_id));

  const costRows = (costs ?? [])
    .filter((c) => !deniedCostIds.has(c.id))
    .map((c) => {
      const threshold = thresholdByProperty.get(c.property_id) ?? 2500;
      const amount = Number(c.amount);
      return {
        id: c.id,
        property_id: c.property_id,
        property_name: unwrapName(c.properties) ?? propertyName(c.property_id),
        description: c.description,
        amount,
        category: c.category,
        incurred_date: c.incurred_date,
        threshold,
        overThreshold: amount > threshold,
      };
    })
    .sort((a, b) => {
      if (a.overThreshold !== b.overThreshold) return a.overThreshold ? -1 : 1;
      return b.amount - a.amount;
    });

  const workOrders = (wos ?? []).map((w) => ({
    id: w.id,
    property_id: w.property_id,
    property_name: unwrapName(w.properties) ?? propertyName(w.property_id),
    wo_number: w.wo_number,
    title: w.title,
    description: w.description ?? null,
    estimated_cost: Number(w.estimated_cost ?? 0),
    actual_cost: Number(w.actual_cost ?? 0),
    vendor_notes: w.vendor_notes,
    status: w.status,
  }));

  const requestRows = (requests ?? []).map((r) => ({
    id: r.id,
    property_id: r.property_id,
    property_name: unwrapName(r.properties) ?? propertyName(r.property_id),
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    tenant_name: unwrapName(r.tenants) ?? "Tenant",
  }));

  const overdueInvoices = (invoices ?? []).map((inv) => ({
    id: inv.id,
    property_id: inv.property_id,
    property_name: unwrapName(inv.properties) ?? propertyName(inv.property_id),
    tenant_name: unwrapName(inv.tenants) ?? "Tenant",
    due_date: inv.due_date,
    period_start: inv.period_start,
    period_end: inv.period_end,
    balance: Number(inv.total) - Number(inv.amount_paid),
  }));

  const expirations = (leases ?? [])
    .filter((l) => l.end_date && l.end_date >= today && l.end_date <= within24)
    .map((l) => {
      const endDate = l.end_date as string;
      const remaining = monthsUntilLeaseEnd(endDate, now);
      return {
        id: l.id,
        property_id: l.property_id,
        property_name: unwrapName(l.properties) ?? propertyName(l.property_id),
        tenant_name: unwrapName(l.tenants) ?? "Tenant",
        end_date: endDate,
        window: expirationWindow(endDate, within12, within18),
        monthsLabel: remaining.monthsLabel,
        monthsRemaining: remaining.monthsRemaining,
      };
    })
    .sort((a, b) => a.end_date.localeCompare(b.end_date));

  // Match property "actions": only costs over the approval threshold need a decision.
  const costsNeedingDecision = costRows.filter((c) => c.overThreshold).length;
  const decisionCount =
    costsNeedingDecision + workOrders.length + requestRows.length;
  const urgentExpirations = expirations.filter((e) => e.window === "12 months")
    .length;
  const attentionCount =
    decisionCount + overdueInvoices.length + urgentExpirations;

  return {
    costs: costRows,
    workOrders,
    requests: requestRows,
    overdueInvoices,
    expirations,
    attentionCount,
    decisionCount,
  };
}

export async function fetchOwnerAttentionCount(
  supabase: SupabaseClient,
  ownerId: string
): Promise<number> {
  const data = await fetchOwnerMyItems(supabase, ownerId);
  return data.attentionCount;
}
