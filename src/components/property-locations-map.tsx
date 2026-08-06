"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { PropertyMapMarker } from "./property-locations-map-inner";

const PropertyLocationsMapInner = dynamic(
  () => import("./property-locations-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] items-center justify-center bg-[#f4f1ea] text-sm text-slate-500">
        Loading map…
      </div>
    ),
  }
);

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]"
      aria-hidden
    >
      {expanded ? (
        <>
          <path d="M9 9H5v4" />
          <path d="M15 15h4v-4" />
          <path d="M5 9l5 5" />
          <path d="M19 15l-5-5" />
        </>
      ) : (
        <>
          <path d="M9 4H4v5" />
          <path d="M15 4h5v5" />
          <path d="M9 20H4v-5" />
          <path d="M15 20h5v-5" />
        </>
      )}
    </svg>
  );
}

export function PropertyLocationsMap({
  markers,
}: {
  markers: PropertyMapMarker[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  if (markers.length === 0) {
    return <p className="text-sm text-slate-600">No mapped properties yet.</p>;
  }

  const fullscreenMap =
    expanded && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex flex-col bg-[#0c1f2e]/60 p-3 sm:p-5">
            <button
              type="button"
              aria-label="Close expanded map"
              className="absolute inset-0 cursor-default"
              onClick={() => setExpanded(false)}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-800/15 bg-[#f4f1ea] shadow-2xl"
            >
              <header className="flex items-center justify-between gap-3 border-b border-slate-800/10 bg-[#0c1f2e] px-4 py-3 text-[#f3efe6]">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#d4a574]">
                    Portfolio map
                  </p>
                  <h2
                    id={titleId}
                    className="font-[family-name:var(--font-display)] text-lg"
                  >
                    Property Locations
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-1.5 rounded border border-white/20 px-2.5 py-1.5 text-xs font-medium hover:bg-white/10"
                >
                  <ExpandIcon expanded />
                  Collapse
                </button>
              </header>
              <div className="min-h-0 flex-1 p-3">
                <div className="h-full overflow-hidden rounded-md border border-slate-200 bg-white">
                  <PropertyLocationsMapInner markers={markers} />
                </div>
              </div>
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="relative h-full min-h-[240px] overflow-hidden rounded-md border border-slate-200">
        <PropertyLocationsMapInner markers={markers} />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-2 z-[500] inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white/95 px-2 py-1 text-[11px] font-medium text-[#0c1f2e] shadow-sm hover:bg-white"
        >
          <ExpandIcon expanded={false} />
          Expand
        </button>
      </div>
      {fullscreenMap}
    </>
  );
}
