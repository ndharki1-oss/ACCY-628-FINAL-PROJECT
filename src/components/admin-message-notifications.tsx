"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { formatMessageDateTime } from "@/lib/admin-messages";

export type AdminMessageBellItem = {
  id: string;
  tenantName: string;
  preview: string;
  createdAt: string;
  isUrgent: boolean;
};

export function AdminMessageNotifications({
  unreadCount,
  recentUnread,
}: {
  unreadCount: number;
  recentUnread: AdminMessageBellItem[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded border border-slate-500 hover:bg-white/10"
      >
        <span className="sr-only">
          {unreadCount > 0
            ? `${unreadCount} unread tenant messages`
            : "Tenant messages"}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
          aria-hidden
        >
          <path d="M6 8.5a6 6 0 0 1 12 0c0 7 3 8.5 3 8.5H3s3-1.5 3-8.5" />
          <path d="M10.3 19a1.7 1.7 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c4784a] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-800/15 bg-[#f4f1ea] text-slate-900 shadow-xl"
        >
          <div className="border-b border-slate-200 bg-[#0c1f2e] px-4 py-3 text-[#f3efe6]">
            <p className="font-[family-name:var(--font-display)] text-base">
              Unread messages
            </p>
            <p className="text-xs text-slate-300">
              {unreadCount === 0
                ? "You're caught up"
                : `${unreadCount} waiting for review`}
            </p>
          </div>

          {recentUnread.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-600">
              No unread tenant messages.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
              {recentUnread.map((item, index) => (
                <li
                  key={item.id ? `unread:${item.id}` : `unread-fallback:${index}`}
                  className="px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#0c1f2e]">
                      {item.tenantName}
                    </p>
                    {item.isUrgent ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800">
                        Urgent
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                    {item.preview}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatMessageDateTime(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-200 px-4 py-3">
            <Link
              href="/admin/messages"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[#c4784a] hover:underline"
            >
              View All Messages
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
