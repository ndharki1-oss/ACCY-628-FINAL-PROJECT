"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  dismissTenantNotification,
  hrefForTenantNotification,
  loadTenantNotifications,
  seedExampleTenantNotifications,
  syncDerivedTenantNotifications,
  TENANT_NOTIFICATIONS_EVENT,
  type CheckoutLeaseHint,
  type TenantNotification,
  type WaitingMessageHint,
} from "@/lib/tenant-notifications-store";

export function TenantNotifications({
  checkoutLeases = [],
  waitingMessage = null,
}: {
  checkoutLeases?: CheckoutLeaseHint[];
  waitingMessage?: WaitingMessageHint | null;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const count = notifications.length;

  useEffect(() => {
    seedExampleTenantNotifications();
    syncDerivedTenantNotifications({ checkoutLeases, waitingMessage });
    setNotifications(loadTenantNotifications());
    // Serialize so stable server payloads don't thrash on new array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [JSON.stringify(checkoutLeases), JSON.stringify(waitingMessage)]);

  useEffect(() => {
    const sync = () => setNotifications(loadTenantNotifications());
    window.addEventListener(TENANT_NOTIFICATIONS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TENANT_NOTIFICATIONS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleNotificationClick(id: string) {
    dismissTenantNotification(id);
    setNotifications(loadTenantNotifications());
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded border border-slate-500 hover:bg-white/10"
      >
        <span className="sr-only">
          Notifications
          {count > 0 ? `, ${count} unread` : ""}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
              Notifications
            </p>
            <p className="text-xs text-slate-500">Updates Needing Attention</p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-600">
              No New Notifications
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => {
                const href = hrefForTenantNotification(n);
                const body = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[#0c1f2e]">
                        {n.subject}
                      </p>
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                    </div>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
                      {n.fromRole} · {n.fromName}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {n.preview}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{n.sentAt}</p>
                  </>
                );

                return (
                  <li
                    key={n.id}
                    className="border-b border-slate-50 bg-[#f8f1ea] last:border-0"
                  >
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => handleNotificationClick(n.id)}
                        className="block px-4 py-3 transition hover:bg-slate-50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n.id)}
                        className="block w-full px-4 py-3 text-left transition hover:bg-slate-50"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
