"use client";

import { useRouter } from "next/navigation";
import type { OwnerFilterOption } from "@/lib/accounting/owner-filter";

export function OwnerColumnFilter({
  owners,
  selectedOwnerId,
  basePath,
}: {
  owners: OwnerFilterOption[];
  selectedOwnerId: string | null;
  basePath: string;
}) {
  const router = useRouter();

  return (
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
            router.push(
              value === "all"
                ? basePath
                : `${basePath}?owner=${encodeURIComponent(value)}`
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
  );
}
