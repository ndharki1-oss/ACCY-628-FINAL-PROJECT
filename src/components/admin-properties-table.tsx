"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatOccupancyPercent } from "@/lib/property-portfolio";
import { formatMoney } from "@/lib/utils";

export type AdminPropertyRow = {
  id: string;
  name: string;
  address: string;
  owner: string;
  type: string;
  unitCount: number;
  occupancyRate: number | null;
  feePercent: number | string | null;
  approvalThreshold: number | string | null;
  status: string;
};

type SortKey = "name" | "occupancy" | "unitCount";

export function AdminPropertiesTable({
  properties,
}: {
  properties: AdminPropertyRow[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const types = useMemo(
    () => [...new Set(properties.map((p) => p.type))].sort(),
    [properties]
  );
  const statuses = useMemo(
    () => [...new Set(properties.map((p) => p.status))].sort(),
    [properties]
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = properties.filter((property) => {
      if (typeFilter !== "all" && property.type !== typeFilter) return false;
      if (statusFilter !== "all" && property.status !== statusFilter) {
        return false;
      }
      if (!needle) return true;
      return [property.name, property.address, property.owner]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    const direction = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sortKey === "occupancy") {
        const aRate = a.occupancyRate ?? -1;
        const bRate = b.occupancyRate ?? -1;
        return (aRate - bRate) * direction;
      }
      if (sortKey === "unitCount") {
        return (a.unitCount - b.unitCount) * direction;
      }
      return a.name.localeCompare(b.name) * direction;
    });
  }, [properties, query, typeFilter, statusFilter, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm md:col-span-2 xl:col-span-1">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, address, or owner"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Type
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm capitalize text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2"
          >
            <option value="all">All types</option>
            {types.map((type) => (
              <option key={type} value={type} className="capitalize">
                {type}
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm capitalize text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2"
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
              Sort
            </span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2"
            >
              <option value="name">Name</option>
              <option value="occupancy">Occupancy</option>
              <option value="unitCount">Unit count</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
              Order
            </span>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">Property Name</th>
              <th className="py-2 pr-3">Address</th>
              <th className="py-2 pr-3">Owner</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Unit Count</th>
              <th className="py-2 pr-3">Occupancy %</th>
              <th className="py-2 pr-3">Fee %</th>
              <th className="py-2 pr-3">Approval $</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">View Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((property) => (
              <tr key={property.id} className="border-b border-slate-100">
                <td className="py-3 pr-3 font-medium text-[#0c1f2e]">
                  {property.name}
                </td>
                <td className="py-3 pr-3 text-slate-600">{property.address}</td>
                <td className="py-3 pr-3">{property.owner || "—"}</td>
                <td className="py-3 pr-3 capitalize">{property.type}</td>
                <td className="py-3 pr-3">{property.unitCount}</td>
                <td className="py-3 pr-3">
                  {formatOccupancyPercent(property.occupancyRate)}
                </td>
                <td className="py-3 pr-3">
                  {property.feePercent != null ? `${property.feePercent}%` : "—"}
                </td>
                <td className="py-3 pr-3">
                  {formatMoney(property.approvalThreshold)}
                </td>
                <td className="py-3 pr-3">
                  <Badge status={property.status} />
                </td>
                <td className="py-3">
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="inline-flex rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  No properties match the current search or filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
