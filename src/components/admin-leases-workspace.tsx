"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatFeePercent, formatMoney } from "@/lib/utils";
import {
  expiresWithinDays,
  formatLeaseDate,
  type LeaseHealth,
  type LeaseDisplayStatus,
  type PaymentStatusLabel,
  type RenewalStatusLabel,
} from "@/lib/lease-operations";

export type AdminLeaseRow = {
  id: string;
  leaseNumber: string;
  tenantId: string;
  tenantName: string;
  tenantContactName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantCreditRating: string | null;
  managementFeePercent: number;
  propertyId: string;
  propertyName: string;
  unitCode: string;
  leaseType: string;
  dbStatus: string;
  displayStatus: LeaseDisplayStatus;
  startDate: string;
  endDate: string;
  baseRent: number;
  cam: number;
  monthlyTotal: number;
  balance: number;
  billingDay: number;
  nextRentDue: string;
  securityDeposit: number;
  securityDepositStatus: string | null;
  renewalStatus: RenewalStatusLabel;
  health: LeaseHealth;
  paymentStatus: PaymentStatusLabel;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  maintenanceCount: number;
  amendments: {
    id: string;
    type: string;
    effectiveDate: string;
    description: string;
  }[];
};

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2";

function actionClass(disabled = false) {
  return `inline-flex rounded border px-2.5 py-1 text-xs font-medium ${
    disabled
      ? "cursor-not-allowed border-slate-200 text-slate-400"
      : "border-[#0c1f2e]/20 text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
  }`;
}

function LeaseDetail({
  lease,
  showTenant,
  showRenewal,
  onToggleTenant,
  onStartRenewal,
  renewalSectionId,
}: {
  lease: AdminLeaseRow;
  showTenant: boolean;
  showRenewal: boolean;
  onToggleTenant: () => void;
  onStartRenewal: () => void;
  renewalSectionId: string;
}) {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
          Lease Overview
        </h3>
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Lease number" value={lease.leaseNumber} />
          <DetailItem label="Tenant" value={lease.tenantName} />
          <DetailItem label="Property" value={lease.propertyName} />
          <DetailItem label="Suite / unit" value={lease.unitCode} />
          <DetailItem
            label="Lease type"
            value={lease.leaseType.replaceAll("_", " ")}
            capitalize
          />
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Current status</dt>
            <dd>
              <Badge status={lease.displayStatus} />
            </dd>
          </div>
          <DetailItem label="Start date" value={formatLeaseDate(lease.startDate)} />
          <DetailItem label="End date" value={formatLeaseDate(lease.endDate)} />
          <DetailItem label="Monthly rent" value={formatMoney(lease.baseRent)} />
          <DetailItem label="CAM / recurring" value={formatMoney(lease.cam)} />
          <DetailItem
            label="Management fee"
            value={`${formatFeePercent(lease.managementFeePercent)} of collected rent`}
          />
          <DetailItem
            label="Tenant credit"
            value={lease.tenantCreditRating ?? "—"}
          />
          <DetailItem
            label="Security deposit"
            value={`${formatMoney(lease.securityDeposit)}${
              lease.securityDepositStatus
                ? ` · ${lease.securityDepositStatus.replaceAll("_", " ")}`
                : ""
            }`}
          />
          <DetailItem label="Current balance" value={formatMoney(lease.balance)} />
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Renewal status</dt>
            <dd>
              <Badge status={lease.renewalStatus} />
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
          Important Dates
        </h3>
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Lease start" value={formatLeaseDate(lease.startDate)} />
          <DetailItem
            label="Lease expiration"
            value={formatLeaseDate(lease.endDate)}
          />
          <DetailItem label="Renewal notice date" value="—" />
          <DetailItem
            label="Next rent due date"
            value={formatLeaseDate(lease.nextRentDue)}
          />
          <DetailItem
            label="Last payment date"
            value={formatLeaseDate(lease.lastPaymentDate)}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
          Financial Snapshot
        </h3>
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Monthly base rent" value={formatMoney(lease.baseRent)} />
          <DetailItem
            label="CAM / other recurring"
            value={formatMoney(lease.cam)}
          />
          <DetailItem
            label="Total monthly amount due"
            value={formatMoney(lease.monthlyTotal)}
          />
          <DetailItem label="Current balance" value={formatMoney(lease.balance)} />
          <DetailItem
            label="Last payment amount"
            value={
              lease.lastPaymentAmount != null
                ? formatMoney(lease.lastPaymentAmount)
                : "—"
            }
          />
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Payment status</dt>
            <dd>
              <Badge status={lease.paymentStatus} />
            </dd>
          </div>
        </dl>
      </section>

      <section id={renewalSectionId}>
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
          Related Activity
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Property profile
            </p>
            <p className="mt-1 text-[#0c1f2e]">{lease.propertyName}</p>
            <Link
              href={`/admin/properties/${lease.propertyId}`}
              className="mt-2 inline-block text-xs text-[#c4784a]"
            >
              Open property →
            </Link>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Payment history
            </p>
            <p className="mt-1 text-[#0c1f2e]">
              Balance {formatMoney(lease.balance)}
            </p>
            <Link
              href="/admin/billing"
              className="mt-2 inline-block text-xs text-[#c4784a]"
            >
              Open billing →
            </Link>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Maintenance requests
            </p>
            <p className="mt-1 text-[#0c1f2e]">
              {`${lease.maintenanceCount} related work order${lease.maintenanceCount === 1 ? "" : "s"}`}
            </p>
            <Link
              href="/admin/work-orders"
              className="mt-2 inline-block text-xs text-[#c4784a]"
            >
              Open work orders →
            </Link>
          </div>
          <div
            className={`rounded border p-3 ${
              showRenewal ? "border-[#c4784a] bg-[#c4784a]/5" : "border-slate-200"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Amendments / renewals
            </p>
            {lease.amendments.length === 0 ? (
              <p className="mt-1 text-slate-600">No amendments on file.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-[#0c1f2e]">
                {lease.amendments.map((amendment) => (
                  <li key={amendment.id}>
                    <span className="capitalize">
                      {amendment.type.replaceAll("_", " ")}
                    </span>{" "}
                    · {formatLeaseDate(amendment.effectiveDate)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded border border-slate-200 p-3 sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Related contract
            </p>
            <p className="mt-1 text-slate-600">
              Not linked yet. A future nullable contract ID on the lease can
              connect this row to the contract module.
            </p>
          </div>
        </div>
      </section>

      {showTenant ? (
        <section className="rounded border border-slate-200 bg-[#f8f5ef] p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Tenant contact
          </p>
          <p className="mt-1 font-medium text-[#0c1f2e]">
            {lease.tenantContactName ?? lease.tenantName}
          </p>
          <p className="text-slate-600">{lease.tenantEmail ?? "No email on file"}</p>
          <p className="text-slate-600">{lease.tenantPhone ?? "No phone on file"}</p>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
          Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onToggleTenant} className={actionClass()}>
            {showTenant ? "Hide Tenant" : "View Tenant"}
          </button>
          <Link
            href={`/admin/properties/${lease.propertyId}`}
            className={actionClass()}
          >
            View Property
          </Link>
          <Link href="/admin/billing" className={actionClass()}>
            View Payment History
          </Link>
          <button type="button" onClick={onStartRenewal} className={actionClass()}>
            Start Renewal Review
          </button>
          <button type="button" disabled className={actionClass(true)}>
            View Related Contract
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailItem({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right text-[#0c1f2e] ${capitalize ? "capitalize" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

export function AdminLeasesWorkspace({ leases }: { leases: AdminLeaseRow[] }) {
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tenantOpenId, setTenantOpenId] = useState<string | null>(null);
  const [renewalFocusId, setRenewalFocusId] = useState<string | null>(null);

  const properties = useMemo(
    () =>
      [...new Map(leases.map((lease) => [lease.propertyId, lease.propertyName])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [leases]
  );
  const statuses = useMemo(
    () => [...new Set(leases.map((lease) => lease.dbStatus))].sort(),
    [leases]
  );
  const types = useMemo(
    () => [...new Set(leases.map((lease) => lease.leaseType))].sort(),
    [leases]
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leases.filter((lease) => {
      if (propertyFilter !== "all" && lease.propertyId !== propertyFilter) {
        return false;
      }
      if (statusFilter !== "all" && lease.dbStatus !== statusFilter) return false;
      if (typeFilter !== "all" && lease.leaseType !== typeFilter) return false;
      if (expiryFilter !== "all") {
        const days = Number(expiryFilter);
        if (!expiresWithinDays(lease.endDate, days)) return false;
      }
      if (!needle) return true;
      return [
        lease.tenantName,
        lease.propertyName,
        lease.unitCode,
        lease.leaseNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [leases, query, propertyFilter, statusFilter, typeFilter, expiryFilter]);

  function toggleDetails(id: string) {
    setExpandedId((current) => (current === id ? null : id));
    if (expandedId === id) {
      setRenewalFocusId(null);
    }
  }

  function startRenewal(id: string) {
    setExpandedId(id);
    setRenewalFocusId(id);
    requestAnimationFrame(() => {
      document
        .getElementById(`lease-renewal-desktop-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document
        .getElementById(`lease-renewal-mobile-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block text-sm md:col-span-2 xl:col-span-1">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tenant, property, suite, or lease #"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Property
          </span>
          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} capitalize`}
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Type
          </span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className={`${inputClass} capitalize`}
          >
            <option value="all">All types</option>
            {types.map((type) => (
              <option key={type} value={type} className="capitalize">
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Expiring
          </span>
          <select
            value={expiryFilter}
            onChange={(event) => setExpiryFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">Any date</option>
            <option value="30">Within 30 days</option>
            <option value="60">Within 60 days</option>
            <option value="90">Within 90 days</option>
          </select>
        </label>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((lease) => (
          <article key={lease.id} className="rounded border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-[#0c1f2e]">{lease.tenantName}</p>
                <p className="text-sm text-slate-600">{lease.propertyName}</p>
              </div>
              <Badge status={lease.health} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-slate-500">End</dt>
                <dd>{formatLeaseDate(lease.endDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Balance</dt>
                <dd>{formatMoney(lease.balance)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Rent + CAM</dt>
                <dd>
                  {formatMoney(lease.baseRent)} + {formatMoney(lease.cam)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Start</dt>
                <dd>{formatLeaseDate(lease.startDate)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge status={lease.displayStatus} />
              <Badge status={lease.renewalStatus} />
              <button
                type="button"
                onClick={() => toggleDetails(lease.id)}
                className={actionClass()}
              >
                {expandedId === lease.id ? "Hide Details" : "View Details"}
              </button>
            </div>
            {expandedId === lease.id ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <LeaseDetail
                  lease={lease}
                  showTenant={tenantOpenId === lease.id}
                  showRenewal={renewalFocusId === lease.id}
                  renewalSectionId={`lease-renewal-mobile-${lease.id}`}
                  onToggleTenant={() =>
                    setTenantOpenId((current) =>
                      current === lease.id ? null : lease.id
                    )
                  }
                  onStartRenewal={() => startRenewal(lease.id)}
                />
              </div>
            ) : null}
          </article>
        ))}
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No leases match the current search or filters.
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">Tenant</th>
              <th className="py-2 pr-3">Property</th>
              <th className="py-2 pr-3">Start</th>
              <th className="py-2 pr-3">End</th>
              <th className="py-2 pr-3">Base rent</th>
              <th className="py-2 pr-3">CAM</th>
              <th className="py-2 pr-3">Balance</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Renewal</th>
              <th className="py-2 pr-3">Health</th>
              <th className="sticky right-0 bg-white py-2 pl-2 shadow-[-8px_0_8px_-8px_rgba(12,31,46,0.2)]">
                View Details
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lease) => (
              <Fragment key={lease.id}>
                <tr className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-3 font-medium text-[#0c1f2e]">
                    {lease.tenantName}
                  </td>
                  <td className="py-3 pr-3">{lease.propertyName}</td>
                  <td className="py-3 pr-3">{formatLeaseDate(lease.startDate)}</td>
                  <td className="py-3 pr-3">{formatLeaseDate(lease.endDate)}</td>
                  <td className="py-3 pr-3">{formatMoney(lease.baseRent)}</td>
                  <td className="py-3 pr-3">{formatMoney(lease.cam)}</td>
                  <td className="py-3 pr-3">{formatMoney(lease.balance)}</td>
                  <td className="whitespace-nowrap py-3 pr-3">
                    <Badge status={lease.displayStatus} />
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3">
                    <Badge status={lease.renewalStatus} />
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3">
                    <Badge status={lease.health} />
                  </td>
                  <td className="sticky right-0 bg-white py-3 pl-2 shadow-[-8px_0_8px_-8px_rgba(12,31,46,0.2)]">
                    <button
                      type="button"
                      onClick={() => toggleDetails(lease.id)}
                      className={actionClass()}
                    >
                      {expandedId === lease.id ? "Hide Details" : "View Details"}
                    </button>
                  </td>
                </tr>
                {expandedId === lease.id ? (
                  <tr className="border-b border-slate-100 bg-[#fbfaf7]">
                    <td colSpan={11} className="px-3 py-4">
                      <LeaseDetail
                        lease={lease}
                        showTenant={tenantOpenId === lease.id}
                        showRenewal={renewalFocusId === lease.id}
                        renewalSectionId={`lease-renewal-desktop-${lease.id}`}
                        onToggleTenant={() =>
                          setTenantOpenId((current) =>
                            current === lease.id ? null : lease.id
                          )
                        }
                        onStartRenewal={() => startRenewal(lease.id)}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  No leases match the current search or filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
