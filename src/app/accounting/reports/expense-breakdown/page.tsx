import { requireExactRole } from "@/lib/auth";
import { OwnerFilterSelect } from "@/components/accounting/owner-filter-select";
import {
  ExpenseBreakdownTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import {
  listOwnersForFilter,
  propertyIdsForOwnerFilter,
  resolveSelectedOwnerId,
} from "@/lib/accounting/owner-filter";
import { fetchExpenseBreakdown } from "@/lib/reports/data";

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

  const rows =
    selectedOwnerId && propertyIds && propertyIds.length === 0
      ? []
      : await fetchExpenseBreakdown(supabase, {
          mode: "full",
          propertyIds,
        });

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Owner Expenses Breakdown"
        subtitle="Property costs by category for owners — filter by owner to focus the portfolio."
      />
      <OwnerFilterSelect
        owners={owners}
        selectedOwnerId={selectedOwnerId}
        basePath={BASE_PATH}
      />
      <ExpenseBreakdownTable rows={rows} mode="full" />
    </div>
  );
}
