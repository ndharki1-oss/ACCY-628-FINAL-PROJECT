"use client";

import { useMemo, useState } from "react";
import { MgmtPnlMonthlyChart } from "@/components/admin/mgmt-pnl-monthly-chart";
import { OwnerNoiBarChart } from "@/components/reports/owner-noi-bar-chart";
import { PropertyNoiBarChart } from "@/components/reports/property-noi-bar-chart";
import { Card } from "@/components/ui";
import type { MgmtPnlMonthlyPoint } from "@/lib/reports/mgmt-pnl-monthly";
import type { PropertyPnLChartActivity } from "@/lib/reports/property-pnl-chart";

export function AdminDashboardCharts({
  monthlySeries,
  chartActivity,
}: {
  monthlySeries: MgmtPnlMonthlyPoint[];
  chartActivity: PropertyPnLChartActivity[];
}) {
  const [propertyOwnerFilter, setPropertyOwnerFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const owners = useMemo(
    () =>
      [...new Set(chartActivity.map((row) => row.ownerName || "Unknown"))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [chartActivity]
  );

  return (
    <Card title="Profitability charts">
      <div className="space-y-6">
        <MgmtPnlMonthlyChart
          series={monthlySeries}
          periodLabel="All periods"
        />
        <PropertyNoiBarChart
          activity={chartActivity}
          owners={owners}
          ownerFilter={propertyOwnerFilter}
          onOwnerFilterChange={setPropertyOwnerFilter}
        />
        <OwnerNoiBarChart
          activity={chartActivity}
          owners={owners}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
        />
      </div>
    </Card>
  );
}
