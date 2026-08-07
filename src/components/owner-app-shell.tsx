"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DemoRoleSwitcher } from "@/components/demo-role-switcher";
import { OwnerNotifications } from "@/components/owner-notifications";
import { PortalSidebarUtilities } from "@/components/portal-sidebar-utilities";
import type {
  OwnerContactMessageHint,
  OwnerItemHint,
} from "@/lib/owner-notifications-store";

type NavLink = { href: string; label: string; badge?: number };

export function OwnerAppShell({
  name,
  links,
  itemHints = [],
  contactMessages = [],
  children,
}: {
  name: string;
  links: NavLink[];
  itemHints?: OwnerItemHint[];
  contactMessages?: OwnerContactMessageHint[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setOpen(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setOpen(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8eef5_0%,_#f4f1ea_45%,_#ebe6dc_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-800/10 bg-[#0c1f2e] text-[#f3efe6]">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="owner-sidebar"
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-500 hover:bg-white/10"
            >
              <span className="sr-only">
                {open ? "Close navigation" : "Open navigation"}
              </span>
              <span className="flex flex-col gap-1.5" aria-hidden>
                <span
                  className={`block h-0.5 w-5 origin-center bg-current transition ${open ? "translate-y-2 rotate-45" : ""}`}
                />
                <span
                  className={`block h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`}
                />
                <span
                  className={`block h-0.5 w-5 origin-center bg-current transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
                />
              </span>
            </button>
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl tracking-tight sm:text-2xl">
                Harborline
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Owner Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm sm:gap-4">
            <OwnerNotifications
              itemHints={itemHints}
              contactMessages={contactMessages}
            />
            <span className="hidden text-slate-300 sm:inline">
              {name} · <DemoRoleSwitcher currentRole="owner" />
            </span>
          </div>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-[#0c1f2e]/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="owner-sidebar"
        className={`fixed bottom-0 left-0 top-[4.75rem] z-40 flex w-64 flex-col border-r border-slate-800/10 bg-[#0c1f2e] text-[#f3efe6] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
          aria-label="Owner"
        >
          {links.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/owner" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center justify-between gap-2 rounded px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-white/15 font-medium text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{l.label}</span>
                {l.badge != null && l.badge > 0 ? (
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold tabular-nums text-white"
                    aria-label={`${l.badge} items need attention`}
                  >
                    {l.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <PortalSidebarUtilities
          helpHref="/owner/help"
          settingsHref="/owner/settings"
        />
      </aside>

      <main
        className={`px-4 py-8 transition-[padding] duration-200 sm:px-6 ${
          open ? "lg:pl-[17.5rem]" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
