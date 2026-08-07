import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExpenseBreakdownRow,
  LaborRow,
  MaintenanceRow,
  MaintenanceSummaryRow,
  OwnerProfitRow,
  PropertyPnLRow,
  ReportScope,
} from "./types";
import {
  invoiceActivityDate,
  type PropertyPnLChartActivity,
} from "./property-pnl-chart";

type AnyClient = SupabaseClient;

async function loadProperties(supabase: AnyClient, propertyIds?: string[]) {
  let q = supabase
    .from("properties")
    .select("id, name, owner_id, owners(company_name)");
  if (propertyIds?.length) {
    q = q.in("id", propertyIds);
  }
  const { data } = await q.order("name");
  return data ?? [];
}

export async function fetchPropertyPnL(
  supabase: AnyClient,
  scope: ReportScope
): Promise<PropertyPnLRow[]> {
  const properties = await loadProperties(supabase, scope.propertyIds);
  const propIds = properties.map((p) => p.id);
  if (!propIds.length) return [];

  const [{ data: invoices }, { data: costs }, { data: labor }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("property_id, total, status, party_type")
        .in("property_id", propIds),
      supabase
        .from("cost_entries")
        .select("property_id, amount, paid_by")
        .eq("paid_by", "owner")
        .in("property_id", propIds),
      supabase
        .from("labor_time_entries")
        .select("property_id, labor_cost")
        .in("property_id", propIds),
    ]);

  return properties.map((p) => {
    const revenue = (invoices ?? [])
      .filter(
        (i) =>
          i.property_id === p.id &&
          i.party_type === "tenant" &&
          i.status !== "void"
      )
      .reduce((s, i) => s + Number(i.total), 0);
    const costAmt = (costs ?? [])
      .filter((c) => c.property_id === p.id)
      .reduce((s, c) => s + Number(c.amount), 0);
    const laborCost = (labor ?? [])
      .filter((l) => l.property_id === p.id)
      .reduce((s, l) => s + Number(l.labor_cost), 0);
    // Formula A: property NOI = tenant revenue − cost_entries only.
    // Harborline labor is returned separately and is not subtracted from NOI.
    const expenses = costAmt;
    const owner = Array.isArray(p.owners) ? p.owners[0] : p.owners;
    return {
      propertyId: p.id,
      propertyName: p.name,
      ownerName: owner?.company_name ?? "Unknown",
      revenue,
      expenses,
      laborCost,
      noi: revenue - expenses,
    };
  });
}

/**
 * Dated invoice/cost activity for the Admin Property P&L chart only.
 * Table aggregates remain in {@link fetchPropertyPnL}.
 */
export async function fetchPropertyPnLChartActivity(
  supabase: AnyClient,
  scope: ReportScope
): Promise<PropertyPnLChartActivity[]> {
  const properties = await loadProperties(supabase, scope.propertyIds);
  const propIds = properties.map((p) => p.id);
  if (!propIds.length) return [];

  const meta = new Map(
    properties.map((p) => {
      const owner = Array.isArray(p.owners) ? p.owners[0] : p.owners;
      return [
        p.id,
        {
          propertyName: p.name as string,
          ownerName: (owner?.company_name as string | undefined) ?? "Unknown",
        },
      ] as const;
    })
  );

  const [{ data: invoices }, { data: costs }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "property_id, total, status, party_type, period_start, period_end, issue_date"
      )
      .in("property_id", propIds),
    supabase
      .from("cost_entries")
      .select("property_id, amount, paid_by, incurred_date")
      .eq("paid_by", "owner")
      .in("property_id", propIds),
  ]);

  const rows: PropertyPnLChartActivity[] = [];

  for (const inv of invoices ?? []) {
    if (inv.party_type !== "tenant" || inv.status === "void") continue;
    const date = invoiceActivityDate(inv);
    if (!date) continue;
    const info = meta.get(inv.property_id);
    if (!info) continue;
    rows.push({
      propertyId: inv.property_id,
      propertyName: info.propertyName,
      ownerName: info.ownerName,
      date,
      revenue: Number(inv.total) || 0,
      expenses: 0,
    });
  }

  for (const cost of costs ?? []) {
    const date = invoiceActivityDate({
      issue_date: cost.incurred_date,
    });
    if (!date) continue;
    const info = meta.get(cost.property_id);
    if (!info) continue;
    rows.push({
      propertyId: cost.property_id,
      propertyName: info.propertyName,
      ownerName: info.ownerName,
      date,
      revenue: 0,
      expenses: Number(cost.amount) || 0,
    });
  }

  return rows;
}

export async function fetchOwnerProfitability(
  supabase: AnyClient,
  scope: ReportScope
): Promise<OwnerProfitRow[]> {
  const pnl = await fetchPropertyPnL(supabase, scope);
  const map = new Map<string, OwnerProfitRow>();
  for (const row of pnl) {
    const key = row.ownerName;
    const cur = map.get(key) ?? {
      ownerId: key,
      ownerName: key,
      propertyCount: 0,
      revenue: 0,
      expenses: 0,
      noi: 0,
    };
    cur.propertyCount += 1;
    cur.revenue += row.revenue;
    cur.expenses += row.expenses;
    cur.noi += row.noi;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.ownerName.localeCompare(b.ownerName));
}

export async function fetchMaintenanceReport(
  supabase: AnyClient,
  scope: ReportScope
): Promise<{ detail: MaintenanceRow[]; summary: MaintenanceSummaryRow[] }> {
  // Employee self: only labor hours
  if (scope.mode === "self" && scope.profileId) {
    const { data: labor } = await supabase
      .from("labor_time_entries")
      .select(
        "id, hours, labor_cost, notes, property_id, work_order_id, properties(name), work_orders(wo_number), profiles(full_name)"
      )
      .eq("profile_id", scope.profileId)
      .order("work_date", { ascending: false });

    const detail: MaintenanceRow[] = (labor ?? []).map((l) => {
      const prop = Array.isArray(l.properties) ? l.properties[0] : l.properties;
      const wo = Array.isArray(l.work_orders) ? l.work_orders[0] : l.work_orders;
      const emp = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
      return {
        propertyId: l.property_id,
        propertyName: prop?.name ?? "Property",
        workOrderId: l.work_order_id,
        workOrderNumber: wo?.wo_number ?? null,
        category: "labor",
        description: l.notes ?? "Labor hours",
        hours: Number(l.hours),
        amount: Number(l.labor_cost),
        employeeName: emp?.full_name ?? null,
      };
    });

    const summaryMap = new Map<string, MaintenanceSummaryRow>();
    for (const d of detail) {
      const cur = summaryMap.get(d.propertyId) ?? {
        propertyId: d.propertyId,
        propertyName: d.propertyName,
        laborCost: 0,
        materialsCost: 0,
        vendorCost: 0,
        otherCost: 0,
        total: 0,
      };
      cur.laborCost += d.amount;
      cur.total += d.amount;
      summaryMap.set(d.propertyId, cur);
    }
    return { detail, summary: [...summaryMap.values()] };
  }

  const properties = await loadProperties(supabase, scope.propertyIds);
  const propIds = properties.map((p) => p.id);
  if (!propIds.length) return { detail: [], summary: [] };

  // Owner summary: billable owner costs only.
  // Full (admin/accounting): also include company-paid materials/parts so the
  // Materials column matches Expense Breakdown / Harborline-absorbed supplies.
  let costsQuery = supabase
    .from("cost_entries")
    .select(
      "id, property_id, category, description, amount, paid_by, work_order_id, work_orders(wo_number), properties(name)"
    )
    .in("property_id", propIds);
  if (scope.mode === "summary") {
    costsQuery = costsQuery.eq("paid_by", "owner");
  } else {
    costsQuery = costsQuery.or(
      "paid_by.eq.owner,category.in.(materials,parts)"
    );
  }

  const [{ data: costs }, { data: labor }] = await Promise.all([
    costsQuery,
    scope.mode === "summary"
      ? Promise.resolve({ data: [] as never[] })
      : supabase
          .from("labor_time_entries")
          .select(
            "id, hours, labor_cost, notes, property_id, work_order_id, properties(name), work_orders(wo_number), profiles(full_name)"
          )
          .in("property_id", propIds),
  ]);

  const detail: MaintenanceRow[] = [];

  if (scope.mode !== "summary") {
    for (const c of costs ?? []) {
      const prop = Array.isArray(c.properties) ? c.properties[0] : c.properties;
      const wo = Array.isArray(c.work_orders) ? c.work_orders[0] : c.work_orders;
      detail.push({
        propertyId: c.property_id,
        propertyName: prop?.name ?? "Property",
        workOrderId: c.work_order_id,
        workOrderNumber: wo?.wo_number ?? null,
        category: String(c.category),
        description: c.description ?? String(c.category),
        hours: null,
        amount: Number(c.amount),
      });
    }
    for (const l of labor ?? []) {
      const prop = Array.isArray(l.properties) ? l.properties[0] : l.properties;
      const wo = Array.isArray(l.work_orders) ? l.work_orders[0] : l.work_orders;
      const emp = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
      detail.push({
        propertyId: l.property_id,
        propertyName: prop?.name ?? "Property",
        workOrderId: l.work_order_id,
        workOrderNumber: wo?.wo_number ?? null,
        category: "labor",
        description: l.notes ?? "Labor hours",
        hours: Number(l.hours),
        amount: Number(l.labor_cost),
        employeeName: emp?.full_name ?? null,
      });
    }
  }

  const summaryMap = new Map<string, MaintenanceSummaryRow>();
  for (const p of properties) {
    summaryMap.set(p.id, {
      propertyId: p.id,
      propertyName: p.name,
      laborCost: 0,
      materialsCost: 0,
      vendorCost: 0,
      otherCost: 0,
      total: 0,
    });
  }
  for (const c of costs ?? []) {
    const cur = summaryMap.get(c.property_id);
    if (!cur) continue;
    const amt = Number(c.amount);
    const cat = String(c.category);
    if (cat === "materials" || cat === "parts") cur.materialsCost += amt;
    else if (cat === "vendor" || cat === "equipment") cur.vendorCost += amt;
    else if (cat === "labor" || cat === "payroll") cur.laborCost += amt;
    else cur.otherCost += amt;
    cur.total += amt;
  }
  // Full mode: add time-entry labor into summary totals
  if (scope.mode !== "summary") {
    for (const l of labor ?? []) {
      const cur = summaryMap.get(l.property_id);
      if (!cur) continue;
      const amt = Number(l.labor_cost);
      cur.laborCost += amt;
      cur.total += amt;
    }
  }

  return { detail, summary: [...summaryMap.values()] };
}

export async function fetchEmployeeLabor(
  supabase: AnyClient,
  scope: ReportScope
): Promise<LaborRow[]> {
  let q = supabase
    .from("labor_time_entries")
    .select(
      "id, profile_id, work_date, hours, hourly_rate, labor_cost, notes, properties(name), work_orders(wo_number), profiles(full_name)"
    )
    .order("work_date", { ascending: false });

  if (scope.profileId) {
    q = q.eq("profile_id", scope.profileId);
  }
  if (scope.propertyIds?.length) {
    q = q.in("property_id", scope.propertyIds);
  }

  const { data } = await q;
  return (data ?? []).map((l) => {
    const prop = Array.isArray(l.properties) ? l.properties[0] : l.properties;
    const wo = Array.isArray(l.work_orders) ? l.work_orders[0] : l.work_orders;
    const emp = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
    return {
      entryId: l.id,
      employeeName: emp?.full_name ?? "Employee",
      profileId: l.profile_id,
      propertyName: prop?.name ?? "Property",
      workOrderNumber: wo?.wo_number ?? null,
      workDate: l.work_date,
      hours: Number(l.hours),
      hourlyRate: Number(l.hourly_rate),
      laborCost: Number(l.labor_cost),
      notes: l.notes,
    };
  });
}

export async function fetchExpenseBreakdown(
  supabase: AnyClient,
  scope: ReportScope
): Promise<ExpenseBreakdownRow[]> {
  const properties = await loadProperties(supabase, scope.propertyIds);
  const propIds = properties.map((p) => p.id);
  if (!propIds.length) return [];

  const [{ data: costs }, { data: labor }] = await Promise.all([
    supabase
      .from("cost_entries")
      .select("category, amount, paid_by")
      .eq("paid_by", "owner")
      .in("property_id", propIds),
    supabase
      .from("labor_time_entries")
      .select("labor_cost")
      .in("property_id", propIds),
  ]);

  const map = new Map<string, number>();
  for (const c of costs ?? []) {
    const cat = String(c.category);
    map.set(cat, (map.get(cat) ?? 0) + Number(c.amount));
  }
  const laborTotal = (labor ?? []).reduce((s, l) => s + Number(l.labor_cost), 0);
  if (laborTotal > 0) {
    map.set("labor", (map.get("labor") ?? 0) + laborTotal);
  }

  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
