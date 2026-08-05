export const OCCUPIED_LEASE_STATUSES = ["active", "renewal_pending"] as const;
export const RESERVED_LEASE_STATUSES = ["draft"] as const;
export const MAINTENANCE_WO_STATUSES = [
  "open",
  "assigned",
  "in_progress",
] as const;

export type UnitOccupancyStatus =
  | "occupied"
  | "vacant"
  | "reserved"
  | "under_maintenance";

export function isOccupiedLeaseStatus(status: string | null | undefined) {
  return status === "active" || status === "renewal_pending";
}

export function occupancyRate(
  unitCount: number,
  occupiedCount: number
): number | null {
  if (unitCount <= 0) return null;
  return occupiedCount / unitCount;
}

export function formatOccupancyPercent(rate: number | null | undefined) {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function unitOccupancyStatus({
  leaseStatus,
  hasMaintenance,
}: {
  leaseStatus: string | null | undefined;
  hasMaintenance: boolean;
}): UnitOccupancyStatus {
  if (isOccupiedLeaseStatus(leaseStatus)) return "occupied";
  if (leaseStatus === "draft") return "reserved";
  if (hasMaintenance) return "under_maintenance";
  return "vacant";
}
