import { requireExactRole } from "@/lib/auth";
import { OwnerFilterSelect } from "@/components/accounting/owner-filter-select";
import {
  MaintenanceDetailTable,
  MaintenanceSummaryTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import {
  listOwnersForFilter,
  propertyIdsForOwnerFilter,
  resolveSelectedOwnerId,
} from "@/lib/accounting/owner-filter";
import { fetchMaintenanceReport } from "@/lib/reports/data";

const BASE_PATH = "/accounting/reports/maintenance";

export default async function AccountingMaintenanceReportPage({
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

  const empty = selectedOwnerId && propertyIds && propertyIds.length === 0;
  const { detail, summary } = empty
    ? { detail: [], summary: [] }
    : await fetchMaintenanceReport(supabase, {
        mode: "full",
        propertyIds,
      });

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Maintenance Cost Report"
        info="Labor hours, parts, and contractor costs by property and work order."
      />
      <OwnerFilterSelect
        owners={owners}
        selectedOwnerId={selectedOwnerId}
        basePath={BASE_PATH}
      />
      <MaintenanceSummaryTable rows={summary} enableExcelExport />
      <MaintenanceDetailTable rows={detail} enableExcelExport />
    </div>
  );
}
