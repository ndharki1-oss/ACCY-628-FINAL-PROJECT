import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultApprovalThresholdFromBaseRent,
  HARBORLINE_MANAGER,
  type ManagementAgreementTemplateData,
} from "./types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type AdminContractListRow = {
  agreementId: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  ownerId: string;
  ownerCompany: string;
  ownerContact: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  feePercent: number;
  aggregateMonthlyBaseRent: number;
  approvalThresholdAmount: number;
};

export async function loadAdminContractsByOwner(
  supabase: SupabaseClient,
  options?: { ownerId?: string }
): Promise<
  {
    ownerId: string;
    ownerCompany: string;
    ownerContact: string | null;
    ownerEmail: string | null;
    ownerPhone: string | null;
    ownerMailingAddress: string | null;
    contracts: AdminContractListRow[];
  }[]
> {
  let agreementsQuery = supabase
    .from("management_agreements")
    .select(
      "id, start_date, end_date, status, fee_percent, notes, property_id, owner_id, properties(id, name, address_line1, city, state, postal_code, property_type, square_feet), owners(id, company_name, contact_name, email, phone, mailing_address)"
    )
    .order("start_date", { ascending: false });

  if (options?.ownerId) {
    agreementsQuery = agreementsQuery.eq("owner_id", options.ownerId);
  }

  const agreementsPromise = agreementsQuery;

  const leasesPromise = (async () => {
    if (!options?.ownerId) {
      return supabase
        .from("leases")
        .select("property_id, base_rent_monthly, status")
        .in("status", ["active", "renewal_pending"]);
    }

    const { data: ownerProperties } = await supabase
      .from("properties")
      .select("id")
      .eq("owner_id", options.ownerId);
    const propertyIds = (ownerProperties ?? []).map((p) => p.id);
    if (propertyIds.length === 0) {
      return { data: [] as { property_id: string; base_rent_monthly: number; status: string }[], error: null };
    }

    return supabase
      .from("leases")
      .select("property_id, base_rent_monthly, status")
      .in("status", ["active", "renewal_pending"])
      .in("property_id", propertyIds);
  })();

  const [{ data: agreements }, { data: leases }] = await Promise.all([
    agreementsPromise,
    leasesPromise,
  ]);

  const baseRentByProperty = new Map<string, number>();
  for (const lease of leases ?? []) {
    if (!lease.property_id) continue;
    const current = baseRentByProperty.get(lease.property_id) ?? 0;
    baseRentByProperty.set(
      lease.property_id,
      current + Number(lease.base_rent_monthly ?? 0)
    );
  }

  const byOwner = new Map<
    string,
    {
      ownerId: string;
      ownerCompany: string;
      ownerContact: string | null;
      ownerEmail: string | null;
      ownerPhone: string | null;
      ownerMailingAddress: string | null;
      contracts: AdminContractListRow[];
    }
  >();

  for (const agreement of agreements ?? []) {
    const property = firstRelation(agreement.properties);
    const owner = firstRelation(agreement.owners);
    const ownerId = owner?.id ?? agreement.owner_id;
    if (!ownerId || !property) continue;

    const aggregateMonthlyBaseRent =
      baseRentByProperty.get(property.id) ?? 0;
    const approvalThresholdAmount =
      defaultApprovalThresholdFromBaseRent(aggregateMonthlyBaseRent);

    const address = [
      property.address_line1,
      [property.city, property.state].filter(Boolean).join(", "),
      property.postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    const row: AdminContractListRow = {
      agreementId: agreement.id,
      propertyId: property.id,
      propertyName: property.name,
      propertyAddress: address,
      ownerId,
      ownerCompany: owner?.company_name ?? "Owner",
      ownerContact: owner?.contact_name ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
      startDate: agreement.start_date,
      endDate: agreement.end_date,
      status: agreement.status,
      feePercent: Number(agreement.fee_percent),
      aggregateMonthlyBaseRent,
      approvalThresholdAmount,
    };

    const existing = byOwner.get(ownerId);
    if (existing) {
      existing.contracts.push(row);
      continue;
    }

    byOwner.set(ownerId, {
      ownerId,
      ownerCompany: owner?.company_name ?? "Owner",
      ownerContact: owner?.contact_name ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
      ownerMailingAddress: owner?.mailing_address ?? null,
      contracts: [row],
    });
  }

  return [...byOwner.values()]
    .map((group) => ({
      ...group,
      contracts: group.contracts.sort((a, b) =>
        a.propertyName.localeCompare(b.propertyName)
      ),
    }))
    .sort((a, b) => a.ownerCompany.localeCompare(b.ownerCompany));
}

export async function loadOwnerManagementAgreements(
  supabase: SupabaseClient,
  ownerId: string
): Promise<AdminContractListRow[]> {
  const groups = await loadAdminContractsByOwner(supabase, { ownerId });
  return groups.flatMap((group) => group.contracts);
}

export async function loadManagementAgreementTemplateData(
  supabase: SupabaseClient,
  agreementId: string,
  options?: { ownerId?: string }
): Promise<ManagementAgreementTemplateData | null> {
  let query = supabase
    .from("management_agreements")
    .select(
      "id, start_date, end_date, status, fee_percent, notes, property_id, owner_id, properties(id, name, address_line1, city, state, postal_code, property_type, square_feet), owners(company_name, contact_name, email, phone, mailing_address)"
    )
    .eq("id", agreementId);

  if (options?.ownerId) {
    query = query.eq("owner_id", options.ownerId);
  }

  const { data: agreement } = await query.maybeSingle();

  if (!agreement) return null;

  const property = firstRelation(agreement.properties);
  const owner = firstRelation(agreement.owners);
  if (!property) return null;

  const { data: leases } = await supabase
    .from("leases")
    .select("base_rent_monthly")
    .eq("property_id", property.id)
    .in("status", ["active", "renewal_pending"]);

  const aggregateMonthlyBaseRent = (leases ?? []).reduce(
    (sum, lease) => sum + Number(lease.base_rent_monthly ?? 0),
    0
  );

  const address = [
    property.address_line1,
    [property.city, property.state].filter(Boolean).join(", "),
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    agreementId: agreement.id,
    startDate: agreement.start_date,
    endDate: agreement.end_date,
    status: agreement.status,
    notes: agreement.notes,
    feePercent: Number(agreement.fee_percent),
    aggregateMonthlyBaseRent,
    approvalThresholdAmount:
      defaultApprovalThresholdFromBaseRent(aggregateMonthlyBaseRent),
    propertyName: property.name,
    propertyAddress: address || "Address on file",
    propertyType: property.property_type ?? "commercial",
    propertySquareFeet:
      property.square_feet == null ? null : Number(property.square_feet),
    ownerCompany: owner?.company_name ?? "Owner",
    ownerContact: owner?.contact_name ?? null,
    ownerEmail: owner?.email ?? null,
    ownerPhone: owner?.phone ?? null,
    ownerMailingAddress: owner?.mailing_address ?? null,
    managerName: HARBORLINE_MANAGER.name,
    managerLabel: HARBORLINE_MANAGER.label,
  };
}
