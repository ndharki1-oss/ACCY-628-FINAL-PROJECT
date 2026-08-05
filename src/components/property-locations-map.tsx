"use client";

import dynamic from "next/dynamic";
import type { PropertyMapMarker } from "./property-locations-map-inner";

const PropertyLocationsMapInner = dynamic(
  () => import("./property-locations-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center bg-[#f4f1ea] text-sm text-slate-500 sm:h-[440px]">
        Loading map…
      </div>
    ),
  }
);

export function PropertyLocationsMap({ markers }: { markers: PropertyMapMarker[] }) {
  if (markers.length === 0) {
    return <p className="text-sm text-slate-600">No mapped properties yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <PropertyLocationsMapInner markers={markers} />
    </div>
  );
}
