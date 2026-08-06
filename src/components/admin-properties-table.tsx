"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
  feeLabel: string;
  approvalThreshold: number | string | null;
  status: string;
};

type SortKey = "name" | "occupancy" | "unitCount";

type GalleryPhoto = { src: string; label: string };
type PhotoPools = { exterior: string[]; interior: string[] };

const PROPERTY_TYPE_PHOTOS: Record<string, PhotoPools> = {
  office: {
    exterior: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
    ],
    interior: [
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  retail: {
    exterior: [
      "https://images.unsplash.com/photo-1763824969015-e5d1d6755782?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1779614710155-2d5670fc0d06?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80",
    ],
    interior: [
      "https://images.unsplash.com/photo-1753029226995-74b05a344bb1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  warehouse: {
    exterior: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1565891741441-64926e441838?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80",
    ],
    interior: [
      "https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  industrial: {
    exterior: [
      "https://images.unsplash.com/photo-1758789667762-56175fe4601c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1759310347407-b0dbfeb8745d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1761396716215-9ccb2a7eda9d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    ],
    interior: [
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

function normalizePropertyType(type: string) {
  const key = type.trim().toLowerCase().replaceAll(" ", "_");
  if (key === "warehouses") return "warehouse";
  if (key in PROPERTY_TYPE_PHOTOS) return key;
  return "office";
}

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDistinct(pool: string[], seed: number, offset: number) {
  const first = pool[seed % pool.length];
  let second = pool[(seed + offset) % pool.length];
  if (second === first && pool.length > 1) {
    second = pool[(seed + offset + 1) % pool.length];
  }
  return [first, second] as const;
}

const PROPERTY_PHOTO_OVERRIDES: Record<string, GalleryPhoto[]> = {
  // Clybourn Commerce — office skyscraper exteriors + unfurnished interiors
  "20000000-0000-0000-0000-000000000015": [
    {
      src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      label: "Exterior",
    },
    {
      src: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=1200&q=80",
      label: "Exterior",
    },
    {
      src: "https://images.unsplash.com/photo-1641159930908-e9eb9ccdc002?auto=format&fit=crop&w=1200&q=80",
      label: "Interior",
    },
    {
      src: "https://images.unsplash.com/photo-1771678040857-51d00a11be7a?auto=format&fit=crop&w=1200&q=80",
      label: "Interior",
    },
  ],
};

function photosForProperty(property: AdminPropertyRow): GalleryPhoto[] {
  const byId = PROPERTY_PHOTO_OVERRIDES[property.id];
  if (byId) return byId;
  if (property.name.trim().toLowerCase() === "clybourn commerce") {
    return PROPERTY_PHOTO_OVERRIDES["20000000-0000-0000-0000-000000000015"];
  }

  const typeKey = normalizePropertyType(property.type);
  const pools = PROPERTY_TYPE_PHOTOS[typeKey] ?? PROPERTY_TYPE_PHOTOS.office;
  const seed = hashSeed(`${property.id}:${typeKey}`);
  const [exteriorA, exteriorB] = pickDistinct(pools.exterior, seed, 2);
  const [interiorA, interiorB] = pickDistinct(pools.interior, seed, 3);

  return [
    { src: exteriorA, label: "Exterior" },
    { src: exteriorB, label: "Exterior" },
    { src: interiorA, label: "Interior" },
    { src: interiorB, label: "Interior" },
  ];
}

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0c1f2e]/55 p-4 sm:p-8">
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
        className="relative z-10 mt-6 w-full max-w-lg overflow-hidden rounded-lg border border-slate-800/10 bg-[#f4f1ea] shadow-xl"
      >
        <div className="relative aspect-[16/10] bg-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={`${current.label} photo of ${property.name}`}
            className="h-full w-full object-cover"
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
