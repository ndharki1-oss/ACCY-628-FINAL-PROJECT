"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { photosForProperty } from "@/lib/property-photos";
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
  feeLabel: string;
  approvalThreshold: number | string | null;
  status: string;
};

type SortKey = "name" | "occupancy" | "unitCount";

function PropertyPreviewDialog({
  property,
  onClose,
}: {
  property: AdminPropertyRow;
  onClose: () => void;
}) {
  const titleId = useId();
  const photos = useMemo(() => photosForProperty(property), [property]);
  const [index, setIndex] = useState(0);
  const current = photos[index] ?? photos[0];

  useEffect(() => {
    setIndex(0);
  }, [property.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setIndex((value) => (value - 1 + photos.length) % photos.length);
      }
      if (event.key === "ArrowRight") {
        setIndex((value) => (value + 1) % photos.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, photos.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0c1f2e]/55 p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close property preview"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 my-auto w-full max-w-lg overflow-hidden rounded-lg border border-slate-800/10 bg-[#f4f1ea] shadow-xl"
      >
        <div className="relative aspect-[16/10] bg-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={`${current.label} photo of ${property.name}`}
            className={
              current.label === "Floor plan"
                ? "h-full w-full bg-white object-contain"
                : "h-full w-full object-cover"
            }
          />
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() =>
              setIndex((value) => (value - 1 + photos.length) % photos.length)
            }
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-[#0c1f2e] shadow ring-1 ring-black/10 hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => setIndex((value) => (value + 1) % photos.length)}
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-[#0c1f2e] shadow ring-1 ring-black/10 hover:bg-white"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#0c1f2e]/65 px-2.5 py-1 text-[11px] text-white">
            <span>{current.label}</span>
            <span className="opacity-70">
              {index + 1}/{photos.length}
            </span>
          </div>
        </div>
        <header className="flex items-start justify-between gap-4 bg-[#0c1f2e] px-5 py-4 text-[#f3efe6]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#d4a574]">
              Property preview
            </p>
            <h3
              id={titleId}
              className="font-[family-name:var(--font-display)] text-xl"
            >
              {property.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </header>
        <dl className="space-y-3 px-5 py-5 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Name
            </dt>
            <dd className="mt-0.5 font-medium text-[#0c1f2e]">{property.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Address
            </dt>
            <dd className="mt-0.5 text-[#0c1f2e]">{property.address}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Owner
            </dt>
            <dd className="mt-0.5 text-[#0c1f2e]">{property.owner || "—"}</dd>
          </div>
        </dl>
        <div className="border-t border-slate-200 px-5 py-4">
          <Link
            href={`/admin/properties/${property.id}`}
            className="inline-flex rounded border border-[#0c1f2e]/20 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
          >
            View full details
          </Link>
        </div>
      </section>
    </div>
  );
}

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
  const [selected, setSelected] = useState<AdminPropertyRow | null>(null);

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
      {selected ? (
        <PropertyPreviewDialog
          property={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
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
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">Property Name</th>
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
                  <button
                    type="button"
                    onClick={() => setSelected(property)}
                    className="text-left text-[#0645ad] underline underline-offset-2 hover:text-[#0b57d0]"
                  >
                    {property.name}
                  </button>
                </td>
                <td className="py-3 pr-3">{property.owner || "—"}</td>
                <td className="py-3 pr-3 capitalize">{property.type}</td>
                <td className="py-3 pr-3">{property.unitCount}</td>
                <td className="py-3 pr-3">
                  {formatOccupancyPercent(property.occupancyRate)}
                </td>
                <td className="py-3 pr-3">
                  <div>{property.feeLabel}</div>
                  {property.feePercent != null ? (
                    <div className="text-xs text-slate-500">
                      Agreement avg {property.feePercent}%
                    </div>
                  ) : null}
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
                <td colSpan={9} className="py-8 text-center text-slate-500">
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
