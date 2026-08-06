import { requireExactRole } from "@/lib/auth";
import { OwnerFilterSelect } from "@/components/accounting/owner-filter-select";
import { ReportHeading } from "@/components/reports/report-tables";
import { AdminExpenseAllocation } from "@/components/admin-expense-allocation";
import {
  listOwnersForFilter,
  propertyIdsForOwnerFilter,
  resolveSelectedOwnerId,
} from "@/lib/accounting/owner-filter";
import {
  inferTaxTreatment,
  type ExpenseLine,
} from "@/lib/expense-allocation";
import { firstRelation } from "@/lib/work-order-routing";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

const BASE_PATH = "/accounting/reports/expense-breakdown";

export default async function AccountingExpenseBreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const { supabase } = await requireExactRole(["accounting"]);
  const params = await searchParams;
  const owners = await listOwnersForFilter(supabase);
  const selectedOwnerId = resolveSelectedOwnerId(params.owner, owners);
  const propertyIds = await propertyIdsForOwnerFilter(
    supabase,
    selectedOwnerId
  );

  const emptyOwnerScope =
    Boolean(selectedOwnerId) && propertyIds && propertyIds.length === 0;

  const [{ data: costs }, { data: company }, { data: labor }] = emptyOwnerScope
    ? [{ data: [] }, { data: [] }, { data: [] }]
    : await Promise.all([
        (() => {
          let q = supabase
            .from("cost_entries")
            .select(
              "id, category, description, amount, incurred_date, paid_by, property_id, properties(name), owners(company_name), work_orders(wo_number)"
            )
            .order("incurred_date", { ascending: false });
          if (propertyIds?.length) {
            q = q.in("property_id", propertyIds);
          }
          return q;
        })(),
        supabase
          .from("company_expenses")
          .select("id, category, description, amount, incurred_date")
          .order("incurred_date", { ascending: false }),
        (() => {
          let q = supabase
            .from("labor_time_entries")
            .select(
              "id, labor_cost, work_date, property_id, properties(name), work_orders(wo_number), profiles(full_name)"
            )
            .order("work_date", { ascending: false });
          if (propertyIds?.length) {
            q = q.in("property_id", propertyIds);
          }
          return q;
        })(),
      ]);

  const ownerFromCosts: ExpenseLine[] = (costs ?? []).map((c) => {
    const property = firstRelation(c.properties);
    const owner = firstRelation(c.owners);
    const wo = firstRelation(c.work_orders);
    const allocation =
      c.paid_by === "company" ? ("company" as const) : ("owner" as const);
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
    const allocation = "company" as const;
    const category = "labor";
    const description = emp?.full_name
      ? `Harborline labor · ${emp.full_name}`
      : "Harborline labor";
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

  // Company OpEx is Harborline-level; hide it when focusing a single owner portfolio.
  const companyLines: ExpenseLine[] = selectedOwnerId
    ? []
    : (company ?? []).map((c) => {
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
      <OwnerFilterSelect
        owners={owners}
        selectedOwnerId={selectedOwnerId}
        basePath={BASE_PATH}
      />
      <AdminExpenseAllocation lines={lines} />
    </div>
  );
}
