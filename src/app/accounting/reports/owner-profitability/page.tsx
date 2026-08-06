import { requireExactRole } from "@/lib/auth";
import { OwnerColumnFilter } from "@/components/accounting/owner-column-filter";
import { ReportHeading } from "@/components/reports/report-tables";
import { Card } from "@/components/ui";
import {
  listOwnersForFilter,
  propertyIdsForOwnerFilter,
  resolveSelectedOwnerId,
} from "@/lib/accounting/owner-filter";
import { fetchOwnerProfitability } from "@/lib/reports/data";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";
import { formatMoney } from "@/lib/utils";

const BASE_PATH = "/accounting/reports/owner-profitability";

export default async function AccountingOwnerProfitabilityPage({
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
      : await fetchOwnerProfitability(supabase, {
          mode: "full",
          propertyIds,
        });

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Owner Profitability"
        subtitle={`${ALL_PERIODS_HINT}. Profit generated from each property owner across all managed properties.`}
      />
      <Card title={`Owner Profitability · ${ALL_PERIODS_HINT}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <OwnerColumnFilter
                  owners={owners}
                  selectedOwnerId={selectedOwnerId}
                  basePath={BASE_PATH}
                />
                <th className="py-2">Properties</th>
                <th className="py-2">Revenue</th>
                <th className="py-2">OpEx (in NOI)</th>
                <th className="py-2">NOI</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    No owners match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.ownerId} className="border-b border-slate-100">
                    <td className="py-2">{r.ownerName}</td>
                    <td className="py-2">{r.propertyCount}</td>
                    <td className="py-2">{formatMoney(r.revenue)}</td>
                    <td className="py-2">{formatMoney(r.expenses)}</td>
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
