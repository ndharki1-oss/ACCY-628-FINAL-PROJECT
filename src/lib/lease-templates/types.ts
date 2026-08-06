export type LeaseTemplateType =
  | "nnn"
  | "modified_gross"
  | "full_service"
  | "percentage_rent";

export type LeaseTemplateData = {
  leaseId: string;
  leaseNumber: string;
  leaseType: LeaseTemplateType;
  status: string;
  startDate: string;
  endDate: string;
  baseRentMonthly: number;
  camMonthly: number;
  percentageRentRate: number | null;
  billingDay: number;
  securityDepositRequired: number;
  lateFeePercent: number;
  graceDays: number;
  propertyName: string;
  unitCode: string | null;
  tenantCompany: string;
  tenantContact: string | null;
  tenantEmail: string | null;
  ownerCompany: string;
  ownerContact: string | null;
  ownerEmail: string | null;
  ownerMailingAddress: string | null;
};

export function isLeaseTemplateType(value: string): value is LeaseTemplateType {
  return (
    value === "nnn" ||
    value === "modified_gross" ||
    value === "full_service" ||
    value === "percentage_rent"
  );
}

export function leaseTypeLabel(type: LeaseTemplateType): string {
  switch (type) {
    case "nnn":
      return "Triple Net (NNN)";
    case "modified_gross":
      return "Modified Gross";
    case "full_service":
      return "Full Service";
    case "percentage_rent":
      return "Percentage Rent";
  }
}
