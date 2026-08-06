import { requireRole } from "@/lib/auth";
import { ReportHeading } from "@/components/reports/report-tables";
import { FeeComponentsView } from "@/components/statements/fee-components-view";
import {
  fetchFeeStatements,
  uniquePeriods,
} from "@/lib/statements/fee-components";

export default async function AdminStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { supabase } = await requireRole(["admin"]);
  const params = await searchParams;

  let rows = [] as Awaited<ReturnType<typeof fetchFeeStatements>>;
  let error: string | null = null;
  try {
    rows = await fetchFeeStatements(supabase);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load statements";
  }

  const periods = uniquePeriods(rows);
  const selectedPeriod =
    params.period &&
    params.period !== "all" &&
    periods.includes(params.period)
      ? params.period
      : null;

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Owner Statements · Fee Components"
        subtitle="Agency take from owner_statement_lines. Base management fee is tenant credit-based % of collections (not management_agreements.fee_percent)."
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {!error ? (
        <FeeComponentsView
          rows={rows}
          periods={periods}
          selectedPeriod={selectedPeriod}
          basePath="/admin/statements"
          propertyHrefPrefix="/admin/properties"
        />
      ) : null}
    </div>
  );
}
