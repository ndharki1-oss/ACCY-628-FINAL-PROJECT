import { formatSpecialtyLabel } from "@/lib/vendors/format-specialty";

export type WorkerAgreementKind = "staff" | "contractor";

export type EmployeeAgreementTemplateData = {
  vendorId: string;
  kind: WorkerAgreementKind;
  workerName: string;
  companyName: string;
  email: string;
  phone: string | null;
  specialtyLabel: string;
  startDate: string;
  hourlyRate: number;
  status: string;
};

export const HARBORLINE_EMPLOYER = {
  name: "Harborline Commercial Management",
  label: "Company",
} as const;

/** Staff labor rate used for in-house WO costing in system. */
export const STAFF_HOURLY_RATE = 55;

/** Contractor labor rate used for escalated WO costing in system. */
export const CONTRACTOR_HOURLY_RATE = 75;

/**
 * Fallback engagement dates when no earlier WO/labor activity exists.
 * Staggered across the demo portfolio timeline (no seed writes).
 */
export const FALLBACK_ENGAGEMENT_DATES: Record<string, string> = {
  "50000000-0000-0000-0000-000000000001": "2024-03-01", // Victor Chen
  "50000000-0000-0000-0000-000000000007": "2024-06-17", // Sam Ortega
  "50000000-0000-0000-0000-000000000008": "2024-09-03", // Jordan Blake
  "50000000-0000-0000-0000-000000000009": "2025-01-13", // Casey Nguyen
  "50000000-0000-0000-0000-000000000010": "2025-02-03", // Riley Soto
  "50000000-0000-0000-0000-000000000011": "2025-03-10", // Avery Quinn
};

export function hourlyRateForKind(kind: WorkerAgreementKind) {
  return kind === "contractor" ? CONTRACTOR_HOURLY_RATE : STAFF_HOURLY_RATE;
}

export function titleForKind(kind: WorkerAgreementKind) {
  return kind === "contractor"
    ? "Independent Contractor Agreement"
    : "Employment Agreement";
}

export function jobTitleFromSpecialty(specialty: string | null | undefined) {
  const label = formatSpecialtyLabel(specialty);
  if (label === "—") return "Maintenance Technician";
  if (label === "General Maintenance") return "General Maintenance Technician";
  return `${label} Technician`;
}
