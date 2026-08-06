"use client";

import { useRouter } from "next/navigation";
import type { OwnerFilterOption } from "@/lib/accounting/owner-filter";

export type PropertyFilterOption = {
  id: string;
  name: string;
};

function buildHref(
  basePath: string,
  ownerId: string | null,
  propertyId: string | null
) {
  const params = new URLSearchParams();
  if (ownerId) params.set("owner", ownerId);
  if (propertyId) params.set("property", propertyId);
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function NoiByPropertyFilters({
  owners,
  properties,
  selectedOwnerId,
  selectedPropertyId,
  basePath,
}: {
  owners: OwnerFilterOption[];
  properties: PropertyFilterOption[];
  selectedOwnerId: string | null;
  selectedPropertyId: string | null;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <>
      <th className="py-2 align-bottom">
        <label className="block min-w-[9rem]">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Property
          </span>
          <select
            className="mt-1 w-full rounded border border-slate-300 bg-white/90 px-2 py-1.5 text-sm font-normal normal-case text-slate-800"
            value={selectedPropertyId ?? "all"}
            onChange={(e) => {
              const value = e.target.value;
              router.push(
                buildHref(
                  basePath,
                  selectedOwnerId,
                  value === "all" ? null : value
                )
              );
            }}
            aria-label="Filter by property"
          >
            <option value="all">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </th>
      <th className="py-2 align-bottom">
        <label className="block min-w-[9rem]">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Owner
          </span>
          <select
            className="mt-1 w-full rounded border border-slate-300 bg-white/90 px-2 py-1.5 text-sm font-normal normal-case text-slate-800"
            value={selectedOwnerId ?? "all"}
            onChange={(e) => {
              const value = e.target.value;
              // Changing owner resets property so the list stays valid for that owner
              router.push(
                buildHref(basePath, value === "all" ? null : value, null)
              );
            }}
            aria-label="Filter by owner"
          >
            <option value="all">All owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.company_name}
              </option>
            ))}
          </select>
        </label>
      </th>
    </>
  );
}
