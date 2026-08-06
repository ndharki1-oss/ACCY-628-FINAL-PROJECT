import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { AdminTenantContractsWorkspace } from "@/components/admin-tenant-contracts-workspace";
import { loadAdminTenantContractsByTenant } from "@/lib/lease-templates/load";

export default async function AdminTenantContractsPage() {
  const { supabase } = await requireRole(["admin"]);
  const groups = await loadAdminTenantContractsByTenant(supabase);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Tenant Contracts"
        info="Lease agreements between property owners and commercial tenants. Documents mirror the lease type templates used in the tenant portal."
      />

      {groups.length === 0 ? (
        <Card title="No tenant leases">
          <p className="text-sm text-slate-600">No tenant leases were found.</p>
        </Card>
      ) : (
        <Suspense
          fallback={
            <Card title="Loading contracts">
              <p className="text-sm text-slate-600">Loading…</p>
            </Card>
          }
        >
          <AdminTenantContractsWorkspace
            groups={groups.map((group) => ({
              tenantId: group.tenantId,
              tenantCompany: group.tenantCompany,
              tenantContact: group.tenantContact,
              tenantEmail: group.tenantEmail,
              tenantPhone: group.tenantPhone,
              contracts: group.contracts.map((contract) => ({
                leaseId: contract.leaseId,
                leaseNumber: contract.leaseNumber,
                leaseType: contract.leaseType,
                status: contract.status,
                startDate: contract.startDate,
                endDate: contract.endDate,
                baseRentMonthly: contract.baseRentMonthly,
                camMonthly: contract.camMonthly,
                propertyName: contract.propertyName,
                propertyAddress: contract.propertyAddress,
                unitCode: contract.unitCode,
              })),
            }))}
          />
        </Suspense>
      )}
    </div>
  );
}
