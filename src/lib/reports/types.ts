export type ReportMode = "full" | "summary" | "self";

export type ReportScope = {
  /** Restrict properties to these IDs (owner). */
  propertyIds?: string[];
  /** Restrict labor rows to this profile (employee). */
  profileId?: string;
  mode: ReportMode;
};

export type PropertyPnLRow = {
  propertyId: string;
  propertyName: string;
  ownerName: string;
  revenue: number;
  expenses: number;
  laborCost: number;
  noi: number;
};

export type OwnerProfitRow = {
  ownerId: string;
  ownerName: string;
  propertyCount: number;
  revenue: number;
  expenses: number;
  noi: number;
};

export type MaintenanceRow = {
  propertyId: string;
  propertyName: string;
  workOrderId: string | null;
  workOrderNumber: string | null;
  category: string;
  description: string;
  hours: number | null;
  amount: number;
  employeeName?: string | null;
};

export type MaintenanceSummaryRow = {
  propertyId: string;
  propertyName: string;
  laborCost: number;
  materialsCost: number;
  vendorCost: number;
  otherCost: number;
  total: number;
};

export type LaborRow = {
  entryId: string;
  employeeName: string;
  profileId: string;
  propertyName: string;
  workOrderNumber: string | null;
  workDate: string;
  hours: number;
  hourlyRate: number;
  laborCost: number;
  notes: string | null;
};

export type ExpenseBreakdownRow = {
  category: string;
  amount: number;
};
