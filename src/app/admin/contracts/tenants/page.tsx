import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { TenantLeaseDocumentButton } from "@/app/admin/contracts/tenants/tenant-lease-document-button";
import { loadAdminTenantContractsByTenant } from "@/lib/lease-templates/load";
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

export default async function AdminTenantContractsPage() {
  const { supabase } = await requireRole(["admin"]);
  const groups = await loadAdminTenantContractsByTenant(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#0c1f2e]">
          Tenant Contracts
        </h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Lease agreements between property owners and commercial tenants.
          Documents mirror the lease type templates used in the tenant portal.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card title="No tenant leases">
          <p className="text-sm text-slate-600">
            No tenant leases were found.
          </p>
        </Card>
      ) : (
        groups.map((group) => (
          <Card
            key={group.tenantId}
            title={group.tenantCompany}
            action={
              <span className="text-xs text-slate-500">
                {group.contracts.length} lease
                {group.contracts.length === 1 ? "" : "s"}
              </span>
            }
          >
            <div className="mb-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Tenant contact
                </p>
                <p className="mt-0.5 font-medium text-[#0c1f2e]">
                  {group.tenantContact ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-0.5">{group.tenantEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Phone
                </p>
                <p className="mt-0.5">{group.tenantPhone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Manager
                </p>
                <p className="mt-0.5 font-medium text-[#0c1f2e]">
                  Harborline Commercial Management
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Lease</th>
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
                  {group.contracts.map((contract) => (
                    <tr
                      key={contract.leaseId}
                      className="border-b border-slate-100"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#0c1f2e]">
                          {contract.leaseNumber}
                        </div>
                        {contract.unitCode ? (
                          <div className="text-xs text-slate-500">
                            Unit {contract.unitCode}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#0c1f2e]">
                          {contract.propertyName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {contract.propertyAddress || "—"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        {formatLeaseType(contract.leaseType)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatDate(contract.startDate)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatDate(contract.endDate)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatMoney(contract.baseRentMonthly)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatMoney(contract.camMonthly)}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge status={contract.status} />
                      </td>
                      <td className="py-3">
                        <TenantLeaseDocumentButton
                          leaseId={contract.leaseId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
