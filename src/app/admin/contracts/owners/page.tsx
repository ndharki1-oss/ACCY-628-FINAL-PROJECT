import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { ContractDocumentButton } from "@/app/admin/contracts/contract-document-button";
import { loadAdminContractsByOwner } from "@/lib/management-agreements/load";
import { formatMoney } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "Year-to-year (auto-renew)";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default async function AdminOwnerContractsPage() {
  const { supabase } = await requireRole(["admin"]);
  const groups = await loadAdminContractsByOwner(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#0c1f2e]">
          Owner Contracts
        </h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Property management agreements between Harborline Commercial Management
          and each property owner. Approval authority defaults to 10% of active
          monthly Base Rent unless an owner requests a different amount.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card title="No management agreements">
          <p className="text-sm text-slate-600">
            No management agreements were found for current properties.
          </p>
        </Card>
      ) : (
        groups.map((group) => (
          <Card
            key={group.ownerId}
            title={group.ownerCompany}
            action={
              <span className="text-xs text-slate-500">
                {group.contracts.length} contract
                {group.contracts.length === 1 ? "" : "s"}
              </span>
            }
          >
            <div className="mb-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Owner contact
                </p>
                <p className="mt-0.5 font-medium text-[#0c1f2e]">
                  {group.ownerContact ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-0.5">{group.ownerEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Phone
                </p>
                <p className="mt-0.5">{group.ownerPhone ?? "—"}</p>
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
                  {group.contracts.map((contract) => (
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
                        <ContractDocumentButton
                          agreementId={contract.agreementId}
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
