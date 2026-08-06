import { requireExactRole } from "@/lib/auth";
import { NoiByPropertyFilters } from "@/components/accounting/noi-by-property-filters";
import { ReportHeading } from "@/components/reports/report-tables";
import { Card } from "@/components/ui";
import {
  listOwnersForFilter,
  propertyIdsForOwnerFilter,
  resolveSelectedOwnerId,
} from "@/lib/accounting/owner-filter";
import { fetchPropertyPnL } from "@/lib/reports/data";
import { formatMoney } from "@/lib/utils";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

const BASE_PATH = "/accounting/reports/property-pnl";

export default async function AccountingPropertyPnLPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; property?: string }>;
}) {
  const { supabase } = await requireExactRole(["accounting"]);
  const params = await searchParams;

  const owners = await listOwnersForFilter(supabase);
  const selectedOwnerId = resolveSelectedOwnerId(params.owner, owners);

  const { data: allProperties } = await supabase
    .from("properties")
    .select("id, name, owner_id")
    .order("name");

  const propertyOptions = (allProperties ?? [])
    .filter((p) => !selectedOwnerId || p.owner_id === selectedOwnerId)
    .map((p) => ({ id: p.id, name: p.name }));

  const selectedPropertyId =
    params.property &&
    params.property !== "all" &&
    propertyOptions.some((p) => p.id === params.property)
      ? params.property
      : null;

  const ownerPropertyIds = await propertyIdsForOwnerFilter(
    supabase,
    selectedOwnerId
  );

  let propertyIds: string[] | undefined;
  if (selectedPropertyId) {
    propertyIds = [selectedPropertyId];
  } else if (selectedOwnerId) {
    propertyIds = ownerPropertyIds ?? [];
  }

  const rows =
    selectedOwnerId && propertyIds && propertyIds.length === 0
      ? []
      : await fetchPropertyPnL(supabase, {
          mode: "full",
          propertyIds,
        });

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Property Profit & Loss"
        subtitle={`${ALL_PERIODS_HINT}. NOI = tenant revenue − cost_entries. Harborline labor is shown separately and is not in NOI.`}
      />
      <Card title={`Property Profit & Loss · ${ALL_PERIODS_HINT}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <NoiByPropertyFilters
                  owners={owners}
                  properties={propertyOptions}
                  selectedOwnerId={selectedOwnerId}
                  selectedPropertyId={selectedPropertyId}
                  basePath={BASE_PATH}
                />
                <th className="py-2">Revenue</th>
                <th className="py-2">OpEx (in NOI)</th>
                <th className="py-2">Harborline labor — not in NOI</th>
                <th className="py-2">NOI</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-500">
                    No properties match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.propertyId} className="border-b border-slate-100">
                    <td className="py-2">{r.propertyName}</td>
                    <td className="py-2">{r.ownerName}</td>
                    <td className="py-2">{formatMoney(r.revenue)}</td>
                    <td className="py-2">{formatMoney(r.expenses)}</td>
                    <td className="py-2">{formatMoney(r.laborCost)}</td>
                    <td
                      className={`py-2 font-medium ${r.noi < 0 ? "text-rose-700" : ""}`}
                    >
                      {formatMoney(r.noi)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
