import { requireExactRole } from "@/lib/auth";
import { OwnerFilterSelect } from "@/components/accounting/owner-filter-select";
import { LaborTable, ReportHeading } from "@/components/reports/report-tables";
import {
  listOwnersForFilter,
  propertyIdsForOwnerFilter,
  resolveSelectedOwnerId,
} from "@/lib/accounting/owner-filter";
import { fetchEmployeeLabor } from "@/lib/reports/data";

const BASE_PATH = "/accounting/reports/employee-labor";

export default async function AccountingEmployeeLaborPage({
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
      : await fetchEmployeeLabor(supabase, {
          mode: "full",
          propertyIds,
        });

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Employee Labor Report"
        info="Labor hours and costs by employee, property, and work order."
      />
      <OwnerFilterSelect
        owners={owners}
        selectedOwnerId={selectedOwnerId}
        basePath={BASE_PATH}
      />
      <LaborTable rows={rows} />
    </div>
  );
}
