"use client";

import { useRouter } from "next/navigation";
import type { NoiRangeKey } from "@/lib/owner/noi-period";

function buildNoiHref(range: NoiRangeKey, propertyId: string) {
  const params = new URLSearchParams();
  params.set("property", propertyId);
  if (range !== "month") params.set("range", range);
  return `/owner/noi?${params.toString()}`;
}

export function NoiPropertySelect({
  selectedId,
  range,
  properties,
}: {
  selectedId: string;
  range: NoiRangeKey;
  properties: { id: string; name: string }[];
}) {
  const router = useRouter();

  return (
    <label className="inline-flex flex-col gap-1 text-xs font-medium text-slate-500">
      Property
      <select
        className="min-w-[12rem] rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-[#0c1f2e] shadow-sm"
        value={selectedId}
        onChange={(e) => {
          router.push(buildNoiHref(range, e.target.value));
        }}
        aria-label="Select property for NOI"
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
