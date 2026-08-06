import { formatSpecialtyLabel } from "@/lib/vendors/format-specialty";

export type WorkerAgreementKind = "staff" | "contractor";

export type WorkTypeRate = {
  workTypeKey: string;
  workTypeLabel: string;
  hourlyRate: number;
};

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
  /** Full schedule used when rates vary by work type (contractors). */
  rateSchedule: WorkTypeRate[];
  status: string;
};

export const HARBORLINE_EMPLOYER = {
  name: "Harborline Commercial Management",
  label: "Company",
} as const;

/** Default staff rate when specialty is unknown (General Maintenance baseline). */
export const STAFF_HOURLY_RATE = 55;

/** Default contractor rate when work type is unknown. */
export const CONTRACTOR_HOURLY_RATE = 75;

/**
 * Staff hourly rates by specialty, aligned with Harborline labor costing tiers
 * observed in demo labor entries ($50–$60 staff; contractor schedule above that).
 */
export const STAFF_HOURLY_RATE_BY_SPECIALTY: Record<string, number> = {
  "pest control": 52,
  "general maintenance": 55,
  plumbing: 58,
  electrical: 60,
  hvac: 60,
};

/**
 * Contractor hourly rates by work type performed. Retained contractors
 * (e.g. Victor Chen / Chen Building Services) bill according to the specialty
 * of the job, not a single flat rate — aligned above in-house staff tiers.
 */
export const CONTRACTOR_HOURLY_RATE_BY_WORK_TYPE: Record<string, number> = {
  "pest control": 68,
  "general maintenance": 72,
  plumbing: 74,
  electrical: 75,
  hvac: 78,
};

const WORK_TYPE_LABELS: Record<string, string> = {
  "pest control": "Pest Control",
  "general maintenance": "General Maintenance",
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
};

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

function specialtyKey(specialty: string | null | undefined) {
  const key = (specialty ?? "").trim().toLowerCase();
  if (
    key &&
    (key in STAFF_HOURLY_RATE_BY_SPECIALTY ||
      key in CONTRACTOR_HOURLY_RATE_BY_WORK_TYPE)
  ) {
    return key;
  }
  const fromLabel = formatSpecialtyLabel(specialty).toLowerCase();
  if (
    fromLabel in STAFF_HOURLY_RATE_BY_SPECIALTY ||
    fromLabel in CONTRACTOR_HOURLY_RATE_BY_WORK_TYPE
  ) {
    return fromLabel;
  }
  return null;
}

export function contractorRateSchedule(): WorkTypeRate[] {
  return Object.entries(CONTRACTOR_HOURLY_RATE_BY_WORK_TYPE)
    .map(([workTypeKey, hourlyRate]) => ({
      workTypeKey,
      workTypeLabel:
        WORK_TYPE_LABELS[workTypeKey] ?? formatSpecialtyLabel(workTypeKey),
      hourlyRate,
    }))
    .sort((a, b) => a.hourlyRate - b.hourlyRate);
}

export function hourlyRateForWorker(
  kind: WorkerAgreementKind,
  specialty: string | null | undefined
) {
  const key = specialtyKey(specialty);
  if (kind === "contractor") {
    if (key && key in CONTRACTOR_HOURLY_RATE_BY_WORK_TYPE) {
      return CONTRACTOR_HOURLY_RATE_BY_WORK_TYPE[key];
    }
    return CONTRACTOR_HOURLY_RATE;
  }
  if (key && key in STAFF_HOURLY_RATE_BY_SPECIALTY) {
    return STAFF_HOURLY_RATE_BY_SPECIALTY[key];
  }
  return STAFF_HOURLY_RATE;
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
