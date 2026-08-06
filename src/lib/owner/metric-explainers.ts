/** Plain-English copy for circled-ⓘ metric tips on the owner portal. */

export const METRIC_EXPLAINERS = {
  remittance:
    "Cash due to you after collections, property expenses, and Harborline’s management fee on the owner statement.",
  portfolioNoi:
    "Portfolio NOI = tenant charges minus operating costs across your properties. Management fee is separate (not OpEx). Dashboard figure is all periods unless noted.",
  propertyNoiAllTime:
    "NOI = tenant charges minus operating costs for this property (all recorded periods). Fee is separate. Use the NOI tab for Month / Quarter / YTD views.",
  periodNoi:
    "NOI = rent and other tenant charges in the selected period, minus operating costs in that period. Excludes debt service and capital repairs. Management fee is shown separately.",
  charges:
    "Charges = tenant invoice totals in the selected period (rent plus other billed items like CAM or fees).",
  opex:
    "OpEx = operating costs recorded for the property in the selected period (repairs, utilities, etc.). Management fee is not included here.",
  occupancy:
    "Occupancy = leased suites ÷ total suites on the property (active and renewal-pending leases).",
  noiMargin:
    "NOI margin = NOI ÷ charges (revenue) for the selected period. Higher means more of each dollar of charges is kept after OpEx.",
  priorNoiChange:
    "The ↑/↓ % next to NOI compares this period’s NOI to the prior period of the same length (e.g. this month vs last month). It is (this NOI − prior NOI) ÷ |prior NOI|.",
  collection:
    "Share of billed amount that is marked paid on invoices covering this month. Uses cumulative paid on those invoices — not only cash received this month.",
} as const;

export type MetricExplainerKey = keyof typeof METRIC_EXPLAINERS;
