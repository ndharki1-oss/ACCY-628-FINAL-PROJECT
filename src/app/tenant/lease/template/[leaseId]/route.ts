import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { buildLeaseTemplatePdf } from "@/lib/lease-templates/build-pdf";
import {
  isLeaseTemplateType,
  type LeaseTemplateData,
} from "@/lib/lease-templates/types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ leaseId: string }> }
) {
  const { leaseId } = await context.params;
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId } = await getLinkedTenantId(supabase, user);

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant not linked." }, { status: 403 });
  }

  const { data: lease, error } = await supabase
    .from("leases")
    .select(
      "id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, percentage_rent_rate, billing_day, security_deposit_required, late_fee_percent, grace_days, properties(name, owners(company_name, contact_name, email, mailing_address)), units(unit_code), tenants(company_name, contact_name, email)"
    )
    .eq("id", leaseId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !lease) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }

  if (!isLeaseTemplateType(lease.lease_type)) {
    return NextResponse.json(
      { error: "Unsupported lease type." },
      { status: 400 }
    );
  }

  const property = firstRelation(lease.properties);
  const owner = firstRelation(property?.owners);
  const unit = firstRelation(lease.units);
  const tenant = firstRelation(lease.tenants);

  const templateData: LeaseTemplateData = {
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

  const bytes = await buildLeaseTemplatePdf(templateData);
  const filename = `${lease.lease_number}-Lease.pdf`;
  const wantsDownload = new URL(_request.url).searchParams.get("download") === "1";

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": wantsDownload
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
