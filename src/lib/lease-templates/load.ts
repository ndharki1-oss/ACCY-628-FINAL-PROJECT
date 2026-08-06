import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isLeaseTemplateType,
  type LeaseTemplateData,
} from "./types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatPropertyAddress(property: {
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
} | null) {
  if (!property) return "";
  return [
    property.address_line1,
    [property.city, property.state].filter(Boolean).join(", "),
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

export type AdminTenantContractRow = {
  leaseId: string;
  leaseNumber: string;
  leaseType: string;
  status: string;
  startDate: string;
  endDate: string;
  baseRentMonthly: number;
  camMonthly: number;
  propertyName: string;
  propertyAddress: string;
  unitCode: string | null;
  tenantId: string;
  tenantCompany: string;
  tenantContact: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
};

export type AdminTenantContractGroup = {
  tenantId: string;
  tenantCompany: string;
  tenantContact: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  contracts: AdminTenantContractRow[];
};

const LEASE_TEMPLATE_SELECT =
  "id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, percentage_rent_rate, billing_day, security_deposit_required, late_fee_percent, grace_days, property_id, properties(id, name, address_line1, city, state, postal_code, owner_id, owners(id, company_name, contact_name, email, mailing_address)), units(unit_code), tenants(company_name, contact_name, email)";

export async function loadAdminTenantContractsByTenant(
  supabase: SupabaseClient,
  options?: { ownerId?: string }
): Promise<AdminTenantContractGroup[]> {
  let leasesQuery = supabase
    .from("leases")
    .select(
      "id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, tenant_id, tenants(id, company_name, contact_name, email, phone), properties(id, name, address_line1, city, state, postal_code, owner_id), units(unit_code)"
    )
    .order("lease_number", { ascending: true });

  if (options?.ownerId) {
    const { data: ownerProperties } = await supabase
      .from("properties")
      .select("id")
      .eq("owner_id", options.ownerId);
    const propertyIds = (ownerProperties ?? []).map((p) => p.id);
    if (propertyIds.length === 0) return [];
    leasesQuery = leasesQuery.in("property_id", propertyIds);
  }

  const { data: leases } = await leasesQuery;

  const byTenant = new Map<string, AdminTenantContractGroup>();

  for (const lease of leases ?? []) {
    const tenant = firstRelation(lease.tenants);
    const property = firstRelation(lease.properties);
    const unit = firstRelation(lease.units);
    const tenantId = tenant?.id ?? lease.tenant_id;
    if (!tenantId) continue;

    const row: AdminTenantContractRow = {
      leaseId: lease.id,
      leaseNumber: lease.lease_number,
      leaseType: lease.lease_type,
      status: lease.status,
      startDate: lease.start_date,
      endDate: lease.end_date,
      baseRentMonthly: Number(lease.base_rent_monthly ?? 0),
      camMonthly: Number(lease.cam_monthly ?? 0),
      propertyName: property?.name ?? "Property",
      propertyAddress: formatPropertyAddress(property),
      unitCode: unit?.unit_code ?? null,
      tenantId,
      tenantCompany: tenant?.company_name ?? "Tenant",
      tenantContact: tenant?.contact_name ?? null,
      tenantEmail: tenant?.email ?? null,
      tenantPhone: tenant?.phone ?? null,
    };

    const existing = byTenant.get(tenantId);
    if (existing) {
      existing.contracts.push(row);
      continue;
    }

    byTenant.set(tenantId, {
      tenantId,
      tenantCompany: tenant?.company_name ?? "Tenant",
      tenantContact: tenant?.contact_name ?? null,
      tenantEmail: tenant?.email ?? null,
      tenantPhone: tenant?.phone ?? null,
      contracts: [row],
    });
  }

  return [...byTenant.values()]
    .map((group) => ({
      ...group,
      contracts: group.contracts.sort((a, b) =>
        a.leaseNumber.localeCompare(b.leaseNumber)
      ),
    }))
    .sort((a, b) => a.tenantCompany.localeCompare(b.tenantCompany));
}

export async function loadOwnerTenantLeases(
  supabase: SupabaseClient,
  ownerId: string
): Promise<AdminTenantContractRow[]> {
  const groups = await loadAdminTenantContractsByTenant(supabase, { ownerId });
  return groups
    .flatMap((group) => group.contracts)
    .sort((a, b) => a.leaseNumber.localeCompare(b.leaseNumber));
}

export async function loadLeaseTemplateData(
  supabase: SupabaseClient,
  leaseId: string,
  options?: { tenantId?: string; ownerId?: string }
): Promise<LeaseTemplateData | null> {
  let query = supabase
    .from("leases")
    .select(LEASE_TEMPLATE_SELECT)
    .eq("id", leaseId);

  if (options?.tenantId) {
    query = query.eq("tenant_id", options.tenantId);
  }

  const { data: lease } = await query.maybeSingle();
  if (!lease || !isLeaseTemplateType(lease.lease_type)) return null;

  const property = firstRelation(lease.properties);
  const owner = firstRelation(property?.owners);
  const unit = firstRelation(lease.units);
  const tenant = firstRelation(lease.tenants);

  if (options?.ownerId) {
    const propertyOwnerId = property?.owner_id ?? owner?.id ?? null;
    if (propertyOwnerId !== options.ownerId) return null;
  }

  return {
    leaseId: lease.id,
    leaseNumber: lease.lease_number,
    leaseType: lease.lease_type,
    status: lease.status,
    startDate: lease.start_date,
    endDate: lease.end_date,
    baseRentMonthly: Number(lease.base_rent_monthly),
    camMonthly: Number(lease.cam_monthly ?? 0),
    percentageRentRate:
      lease.percentage_rent_rate == null
        ? null
        : Number(lease.percentage_rent_rate),
    billingDay: Number(lease.billing_day ?? 1),
    securityDepositRequired: Number(lease.security_deposit_required ?? 0),
    lateFeePercent: Number(lease.late_fee_percent ?? 5),
    graceDays: Number(lease.grace_days ?? 7),
    propertyName: property?.name ?? "Property",
    unitCode: unit?.unit_code ?? null,
    tenantCompany: tenant?.company_name ?? "Tenant",
    tenantContact: tenant?.contact_name ?? null,
    tenantEmail: tenant?.email ?? null,
    ownerCompany: owner?.company_name ?? "Owner",
    ownerContact: owner?.contact_name ?? null,
    ownerEmail: owner?.email ?? null,
    ownerMailingAddress: owner?.mailing_address ?? null,
  };
}
