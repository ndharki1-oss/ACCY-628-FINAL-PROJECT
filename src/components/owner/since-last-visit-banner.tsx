"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatLastVisitLabel,
  readLastVisitAt,
  writeLastVisitAt,
} from "@/lib/owner/last-visit";

export type SinceLastVisitSnapshot = {
  costApprovals: number;
  workOrders: number;
  requests: number;
  overdue: number;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function buildFragments(snapshot: SinceLastVisitSnapshot): string[] {
  const parts: string[] = [];
  if (snapshot.costApprovals > 0) {
    parts.push(plural(snapshot.costApprovals, "cost approval waiting", "cost approvals waiting"));
  }
  if (snapshot.workOrders > 0) {
    parts.push(plural(snapshot.workOrders, "work order to review", "work orders to review"));
  }
  if (snapshot.requests > 0) {
    parts.push(plural(snapshot.requests, "open request", "open requests"));
  }
  if (snapshot.overdue > 0) {
    parts.push(plural(snapshot.overdue, "overdue rent item", "overdue rent items"));
  }
  return parts.slice(0, 3);
}

export function SinceLastVisitBanner({
  ownerId,
  snapshot,
}: {
  ownerId: string;
  snapshot: SinceLastVisitSnapshot;
}) {
  const [lastVisit, setLastVisit] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previous = readLastVisitAt(ownerId);
    setLastVisit(previous);
    setReady(true);
    writeLastVisitAt(ownerId);
  }, [ownerId]);

  const fragments = useMemo(() => buildFragments(snapshot), [snapshot]);
  const hasItems = fragments.length > 0;

  if (!ready) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500"
        aria-hidden
      >
        Checking what’s new…
      </div>
    );
  }

  const title = lastVisit
    ? "Since your last visit"
    : "Needs your attention now";

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        hasItems
          ? "border-amber-200 bg-amber-50/90"
          : "border-slate-200 bg-white/80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-[#0c1f2e]">{title}</p>
          {hasItems ? (
            <p className="text-sm text-slate-700">{fragments.join(" · ")}</p>
          ) : (
            <p className="text-sm text-slate-600">
              {lastVisit
                ? "You’re all caught up — nothing new waiting right now."
                : "Nothing waiting in your decision or overdue queues."}
            </p>
          )}
          {lastVisit ? (
            <p className="text-xs text-slate-500">
              Last look: {formatLastVisitLabel(lastVisit)}
            </p>
          ) : null}
        </div>
        <Link
          href="/owner/items"
          className="shrink-0 text-sm font-medium text-[#c4784a] hover:underline"
        >
          My Items →
        </Link>
      </div>
    </div>
  );
}
