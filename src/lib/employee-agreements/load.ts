import type { SupabaseClient } from "@supabase/supabase-js";
import { formatSpecialtyLabel } from "@/lib/vendors/format-specialty";
import {
  FALLBACK_ENGAGEMENT_DATES,
  contractorRateSchedule,
  hourlyRateForWorker,
  type EmployeeAgreementTemplateData,
  type WorkTypeRate,
  type WorkerAgreementKind,
} from "./types";

export type AdminEmployeeContractRow = {
  vendorId: string;
  kind: WorkerAgreementKind;
  workerName: string;
  companyName: string;
  email: string;
  phone: string | null;
  specialtyLabel: string;
  startDate: string;
  hourlyRate: number;
  rateSchedule: WorkTypeRate[];
  status: string;
};

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const asDate = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(asDate) ? asDate : null;
  }
  return d.toISOString().slice(0, 10);
}

function earlierDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

export async function loadAdminEmployeeContracts(
  supabase: SupabaseClient
): Promise<AdminEmployeeContractRow[]> {
  const { data: vendors } = await supabase
    .from("vendors")
    .select(
      "id, company_name, contact_name, email, phone, specialty, worker_type, active, profile_id"
    )
    .in("worker_type", ["staff", "contractor"])
    .eq("active", true)
    .order("worker_type", { ascending: true })
    .order("contact_name", { ascending: true });

  const rows = vendors ?? [];
  if (rows.length === 0) return [];

  const vendorIds = rows.map((v) => v.id);
  const profileIds = rows
    .map((v) => v.profile_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: workOrders }, { data: labor }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("vendor_id, created_at, scheduled_date, completed_at")
      .in("vendor_id", vendorIds),
    profileIds.length > 0
      ? supabase
          .from("labor_time_entries")
          .select("profile_id, work_date")
          .in("profile_id", profileIds)
      : Promise.resolve({ data: [] as { profile_id: string; work_date: string }[] }),
  ]);

  const earliestByVendor = new Map<string, string>();
  for (const wo of workOrders ?? []) {
    if (!wo.vendor_id) continue;
    const candidate = earlierDate(
      toDateOnly(wo.scheduled_date),
      earlierDate(toDateOnly(wo.completed_at), toDateOnly(wo.created_at))
    );
    earliestByVendor.set(
      wo.vendor_id,
      earlierDate(earliestByVendor.get(wo.vendor_id) ?? null, candidate) ??
        FALLBACK_ENGAGEMENT_DATES[wo.vendor_id] ??
        "2025-01-01"
    );
  }

  const earliestByProfile = new Map<string, string>();
  for (const entry of labor ?? []) {
    if (!entry.profile_id) continue;
    const workDate = toDateOnly(entry.work_date);
    earliestByProfile.set(
      entry.profile_id,
      earlierDate(earliestByProfile.get(entry.profile_id) ?? null, workDate) ??
        workDate ??
        "2025-01-01"
    );
  }

  return rows
    .map((vendor) => {
      const kind = (vendor.worker_type === "contractor"
        ? "contractor"
        : "staff") as WorkerAgreementKind;
      const fromWo = earliestByVendor.get(vendor.id) ?? null;
      const fromLabor = vendor.profile_id
        ? earliestByProfile.get(vendor.profile_id) ?? null
        : null;
      const startDate =
        earlierDate(fromWo, fromLabor) ??
        FALLBACK_ENGAGEMENT_DATES[vendor.id] ??
        "2025-01-01";

      return {
        vendorId: vendor.id,
        kind,
        workerName: vendor.contact_name,
        companyName: vendor.company_name,
        email: vendor.email,
        phone: vendor.phone,
        specialtyLabel: formatSpecialtyLabel(vendor.specialty),
        startDate,
        hourlyRate: hourlyRateForWorker(kind, vendor.specialty),
        rateSchedule: kind === "contractor" ? contractorRateSchedule() : [],
        status: vendor.active ? "active" : "inactive",
      } satisfies AdminEmployeeContractRow;
    })
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "staff" ? -1 : 1;
      return a.workerName.localeCompare(b.workerName);
    });
}

export async function loadEmployeeAgreementTemplateData(
  supabase: SupabaseClient,
  vendorId: string
): Promise<EmployeeAgreementTemplateData | null> {
  const contracts = await loadAdminEmployeeContracts(supabase);
  const row = contracts.find((c) => c.vendorId === vendorId);
  if (!row) return null;

  return {
    vendorId: row.vendorId,
    kind: row.kind,
    workerName: row.workerName,
    companyName: row.companyName,
    email: row.email,
    phone: row.phone,
    specialtyLabel: row.specialtyLabel,
    startDate: row.startDate,
    hourlyRate: row.hourlyRate,
    rateSchedule: row.rateSchedule,
    status: row.status,
  };
}
