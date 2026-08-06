import { requireRole } from "@/lib/auth";
import { ReportHeading } from "@/components/reports/report-tables";
import { AdminExpenseAllocation } from "@/components/admin-expense-allocation";
import {
  inferTaxTreatment,
  type ExpenseLine,
} from "@/lib/expense-allocation";
import { firstRelation } from "@/lib/work-order-routing";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AdminExpenseBreakdownPage() {
  const { supabase } = await requireRole(["admin"]);

  const [{ data: costs }, { data: company }, { data: labor }] = await Promise.all([
    supabase
      .from("cost_entries")
      .select(
        "id, category, description, amount, incurred_date, properties(name), owners(company_name), work_orders(wo_number)"
      )
      .order("incurred_date", { ascending: false }),
    supabase
      .from("company_expenses")
      .select("id, category, description, amount, incurred_date")
      .order("incurred_date", { ascending: false }),
    supabase
      .from("labor_time_entries")
      .select(
        "id, labor_cost, work_date, properties(name), work_orders(wo_number), profiles(full_name)"
      )
      .order("work_date", { ascending: false }),
  ]);

  const ownerFromCosts: ExpenseLine[] = (costs ?? []).map((c) => {
    const property = firstRelation(c.properties);
    const owner = firstRelation(c.owners);
    const wo = firstRelation(c.work_orders);
    const allocation = "owner" as const;
    const category = String(c.category);
    const description = c.description;
    const amount = Number(c.amount);
    return {
      id: `cost-${c.id}`,
      allocation,
      date: c.incurred_date,
      propertyName: property?.name ?? "—",
      ownerName: owner?.company_name ?? "—",
      category,
      description,
      amount,
      workOrderNumber: wo?.wo_number ?? null,
      taxTreatment: inferTaxTreatment({
        allocation,
        category,
        description,
        amount,
      }),
    };
  });

  const ownerFromLabor: ExpenseLine[] = (labor ?? []).map((l) => {
    const property = firstRelation(l.properties);
    const wo = firstRelation(l.work_orders);
    const emp = firstRelation(l.profiles);
    const allocation = "owner" as const;
    const category = "labor";
    const description = emp?.full_name
      ? `Labor · ${emp.full_name}`
      : "Property labor";
    const amount = Number(l.labor_cost);
    return {
      id: `labor-${l.id}`,
      allocation,
      date: l.work_date,
      propertyName: property?.name ?? "—",
      ownerName: null,
      category,
      description,
      amount,
      workOrderNumber: wo?.wo_number ?? null,
      taxTreatment: inferTaxTreatment({
        allocation,
        category,
        description,
        amount,
      }),
    };
  });

  const companyLines: ExpenseLine[] = (company ?? []).map((c) => {
    const allocation = "company" as const;
    const category = String(c.category);
    const description = c.description;
    const amount = Number(c.amount);
    return {
      id: `co-${c.id}`,
      allocation,
      date: c.incurred_date,
      propertyName: null,
      ownerName: null,
      category,
      description,
      amount,
      workOrderNumber: null,
      taxTreatment: inferTaxTreatment({
        allocation,
        category,
        description,
        amount,
      }),
    };
  });

  const lines = [...ownerFromCosts, ...ownerFromLabor, ...companyLines].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Expense allocation"
        subtitle={`${ALL_PERIODS_HINT}. Light overview first: Owner vs Company. Click a hyperlink for the full line-item breakdown. Tax labels are advisory demo tags only.`}
      />
      <AdminExpenseAllocation lines={lines} />
    </div>
  );
}
