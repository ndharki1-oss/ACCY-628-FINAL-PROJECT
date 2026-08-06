import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { OwnerManagementAgreementButton } from "@/app/owner/contracts/management-agreement-button";
import { OwnerTenantLeaseButton } from "@/app/owner/contracts/tenant-lease-button";
import { loadOwnerManagementAgreements } from "@/lib/management-agreements/load";
import { loadOwnerTenantLeases } from "@/lib/lease-templates/load";
import {
  isLeaseTemplateType,
  leaseTypeLabel,
} from "@/lib/lease-templates/types";
import { formatMoney } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatLeaseType(type: string) {
  if (isLeaseTemplateType(type)) return leaseTypeLabel(type);
  return type.replaceAll("_", " ");
}

export default async function OwnerContractsPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  if (!ownerId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#0c1f2e]">
            Contracts
          </h1>
          <p className="mt-1 text-sm text-rose-700">
            {ownerError ?? "This login is not linked to an owner record."}
          </p>
        </div>
      </div>
    );
  }

  const [agreements, leases] = await Promise.all([
    loadOwnerManagementAgreements(supabase, ownerId),
    loadOwnerTenantLeases(supabase, ownerId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#0c1f2e]">
          Contracts
        </h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Your property management agreements with Harborline and the tenant
          leases on your properties.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0c1f2e]">
            Management agreements
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Year-to-year contracts with Harborline Commercial Management.
            Approval authority defaults to 10% of active monthly Base Rent.
          </p>
        </div>

        {agreements.length === 0 ? (
          <Card title="No management agreements">
            <p className="text-sm text-slate-600">
              No management agreements are on file for your properties.
            </p>
          </Card>
        ) : (
          <Card
            title="Harborline Commercial Management"
            action={
              <span className="text-xs text-slate-500">
                {agreements.length} contract
                {agreements.length === 1 ? "" : "s"}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Property</th>
                    <th className="py-2 pr-3">Start</th>
                    <th className="py-2 pr-3">Term</th>
                    <th className="py-2 pr-3">Fee %</th>
                    <th className="py-2 pr-3">Approval (10% Base Rent)</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((contract) => (
                    <tr
                      key={contract.agreementId}
                      className="border-b border-slate-100"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#0c1f2e]">
                          {contract.propertyName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {contract.propertyAddress}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        {formatDate(contract.startDate)}
                      </td>
                      <td className="py-3 pr-3">Year-to-year</td>
                      <td className="py-3 pr-3">{contract.feePercent}%</td>
                      <td className="py-3 pr-3">
                        <div>
                          {formatMoney(contract.approvalThresholdAmount)}
                        </div>
                        <div className="text-xs text-slate-500">
                          10% of {formatMoney(contract.aggregateMonthlyBaseRent)}
                          /mo Base Rent
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge status={contract.status} />
                      </td>
                      <td className="py-3">
                        <OwnerManagementAgreementButton
                          agreementId={contract.agreementId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0c1f2e]">
            Tenant leases
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Lease agreements between you and the commercial tenants occupying
            your properties.
          </p>
        </div>

        {leases.length === 0 ? (
          <Card title="No tenant leases">
            <p className="text-sm text-slate-600">
              No tenant leases are on file for your properties.
            </p>
          </Card>
        ) : (
          <Card
            title="Lease portfolio"
            action={
              <span className="text-xs text-slate-500">
                {leases.length} lease{leases.length === 1 ? "" : "s"}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Lease</th>
                    <th className="py-2 pr-3">Tenant</th>
                    <th className="py-2 pr-3">Property</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Start</th>
                    <th className="py-2 pr-3">End</th>
                    <th className="py-2 pr-3">Base Rent</th>
                    <th className="py-2 pr-3">CAM</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {leases.map((lease) => (
                    <tr
                      key={lease.leaseId}
                      className="border-b border-slate-100"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#0c1f2e]">
                          {lease.leaseNumber}
                        </div>
                        {lease.unitCode ? (
                          <div className="text-xs text-slate-500">
                            Unit {lease.unitCode}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#0c1f2e]">
                          {lease.tenantCompany}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lease.tenantContact ?? "—"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#0c1f2e]">
                          {lease.propertyName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lease.propertyAddress || "—"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        {formatLeaseType(lease.leaseType)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatDate(lease.startDate)}
                      </td>
                      <td className="py-3 pr-3">{formatDate(lease.endDate)}</td>
                      <td className="py-3 pr-3">
                        {formatMoney(lease.baseRentMonthly)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatMoney(lease.camMonthly)}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge status={lease.status} />
                      </td>
                      <td className="py-3">
                        <OwnerTenantLeaseButton leaseId={lease.leaseId} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
