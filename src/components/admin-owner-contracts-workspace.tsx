"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CollapsibleCard } from "@/components/collapsible-card";
import { Badge } from "@/components/ui";
import { ContractDocumentButton } from "@/app/admin/contracts/contract-document-button";
import { formatMoney } from "@/lib/utils";

export type OwnerContractGroupView = {
  ownerId: string;
  ownerCompany: string;
  ownerContact: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  contracts: {
    agreementId: string;
    propertyName: string;
    propertyAddress: string;
    startDate: string | null;
    feePercent: number;
    approvalThresholdAmount: number;
    aggregateMonthlyBaseRent: number;
    status: string;
  }[];
};

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

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2";

export function AdminOwnerContractsWorkspace({
  groups,
}: {
  groups: OwnerContractGroupView[];
}) {
  const searchParams = useSearchParams();
  const expandId = searchParams.get("expand");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!expandId) return;
    const el = document.getElementById(`owner-contract-${expandId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => {
      const hay = [
        group.ownerCompany,
        group.ownerContact,
        group.ownerEmail,
        group.ownerPhone,
        ...group.contracts.flatMap((c) => [c.propertyName, c.propertyAddress]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [groups, query]);

  return (
    <div className="space-y-4">
      <label className="block max-w-md text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Owner, contact, or property"
          className={inputClass}
        />
      </label>

      {filtered.length === 0 ? (
        <CollapsibleCard title="No matching contracts" defaultOpen>
          <p className="text-sm text-slate-600">
            No owner contracts match the current search.
          </p>
        </CollapsibleCard>
      ) : (
        filtered.map((group) => (
          <CollapsibleCard
            key={group.ownerId}
            id={`owner-contract-${group.ownerId}`}
            title={group.ownerCompany}
            defaultOpen={
              expandId ? expandId === group.ownerId : true
            }
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
          </CollapsibleCard>
        ))
      )}
    </div>
  );
}
