"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  loadTenantNotifications,
  markAllTenantNotificationsRead,
  TENANT_NOTIFICATIONS_EVENT,
  type TenantNotification,
} from "@/lib/tenant-notifications-store";

export function TenantNotifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const sync = () => setNotifications(loadTenantNotifications());
    sync();
    window.addEventListener(TENANT_NOTIFICATIONS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TENANT_NOTIFICATIONS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    markAllTenantNotificationsRead();
    setNotifications(loadTenantNotifications());

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
          {unread > 0 ? `, ${unread} unread` : ""}
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
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c4784a] px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Message notifications"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
              Messages
            </p>
            <p className="text-xs text-slate-500">Updates Needing Attention</p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-600">
              No New Messages
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-slate-50 px-4 py-3 last:border-0 ${
                    n.read ? "bg-white" : "bg-[#f8f1ea]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#0c1f2e]">
                      {n.subject}
                    </p>
                    {!n.read ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#c4784a]" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
                    {n.fromRole} · {n.fromName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {n.preview}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{n.sentAt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
