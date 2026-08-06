"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CollapsibleCard } from "@/components/collapsible-card";
import { Badge } from "@/components/ui";
import { TenantLeaseDocumentButton } from "@/app/admin/contracts/tenants/tenant-lease-document-button";
import {
  isLeaseTemplateType,
  leaseTypeLabel,
} from "@/lib/lease-templates/types";
import { formatMoney } from "@/lib/utils";

export type TenantContractGroupView = {
  tenantId: string;
  tenantCompany: string;
  tenantContact: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  contracts: {
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
  }[];
};

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

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2";

export function AdminTenantContractsWorkspace({
  groups,
}: {
  groups: TenantContractGroupView[];
}) {
  const searchParams = useSearchParams();
  const expandId = searchParams.get("expand");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!expandId) return;
    const el = document.getElementById(`tenant-contract-${expandId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => {
      const hay = [
        group.tenantCompany,
        group.tenantContact,
        group.tenantEmail,
        group.tenantPhone,
        ...group.contracts.flatMap((c) => [
          c.leaseNumber,
          c.propertyName,
          c.propertyAddress,
          c.unitCode,
        ]),
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
          placeholder="Tenant, lease #, or property"
          className={inputClass}
        />
      </label>

      {filtered.length === 0 ? (
        <CollapsibleCard title="No matching leases" defaultOpen>
          <p className="text-sm text-slate-600">
            No tenant contracts match the current search.
          </p>
        </CollapsibleCard>
      ) : (
        filtered.map((group) => (
          <CollapsibleCard
            key={group.tenantId}
            id={`tenant-contract-${group.tenantId}`}
            title={group.tenantCompany}
            defaultOpen={expandId ? expandId === group.tenantId : true}
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
                        <TenantLeaseDocumentButton leaseId={contract.leaseId} />
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
