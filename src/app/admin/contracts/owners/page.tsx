import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { AdminOwnerContractsWorkspace } from "@/components/admin-owner-contracts-workspace";
import { loadAdminContractsByOwner } from "@/lib/management-agreements/load";

export default async function AdminOwnerContractsPage() {
  const { supabase } = await requireRole(["admin"]);
  const groups = await loadAdminContractsByOwner(supabase);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Owner Contracts"
        vital="Approval authority defaults to 10% of active monthly Base Rent unless an owner requests a different amount."
        info="Property management agreements between Harborline Commercial Management and each property owner."
      />

      {groups.length === 0 ? (
        <Card title="No management agreements">
          <p className="text-sm text-slate-600">
            No management agreements were found for current properties.
          </p>
        </Card>
      ) : (
        <Suspense
          fallback={
            <Card title="Loading contracts">
              <p className="text-sm text-slate-600">Loading…</p>
            </Card>
          }
        >
          <AdminOwnerContractsWorkspace
            groups={groups.map((group) => ({
              ownerId: group.ownerId,
              ownerCompany: group.ownerCompany,
              ownerContact: group.ownerContact,
              ownerEmail: group.ownerEmail,
              ownerPhone: group.ownerPhone,
              contracts: group.contracts.map((contract) => ({
                agreementId: contract.agreementId,
                propertyName: contract.propertyName,
                propertyAddress: contract.propertyAddress,
                startDate: contract.startDate,
                feePercent: contract.feePercent,
                approvalThresholdAmount: contract.approvalThresholdAmount,
                aggregateMonthlyBaseRent: contract.aggregateMonthlyBaseRent,
                status: contract.status,
              })),
            }))}
          />
        </Suspense>
      )}
    </div>
  );
}
