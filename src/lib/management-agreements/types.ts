export type ManagementAgreementTemplateData = {
  agreementId: string;
  startDate: string;
  endDate: string | null;
  status: string;
  notes: string | null;
  feePercent: number;
  /** Aggregate monthly Base Rent under active leases at the Property. */
  aggregateMonthlyBaseRent: number;
  /** Always 10% of aggregateMonthlyBaseRent (not a stored threshold). */
  approvalThresholdAmount: number;
  propertyName: string;
  propertyAddress: string;
  propertyType: string;
  propertySquareFeet: number | null;
  ownerCompany: string;
  ownerContact: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerMailingAddress: string | null;
  managerName: string;
  managerLabel: string;
};

export const HARBORLINE_MANAGER = {
  name: "Harborline Commercial Management",
  label: "Property Manager",
} as const;

export function defaultApprovalThresholdFromBaseRent(
  aggregateMonthlyBaseRent: number
) {
  return Math.round(aggregateMonthlyBaseRent * 0.1 * 100) / 100;
}
