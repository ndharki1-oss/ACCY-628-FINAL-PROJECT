"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";

export type AccountingNavChild = { href: string; label: string };

export type AccountingNavItem =
  | { href: string; label: string; children?: undefined }
  | { label: string; href?: undefined; children: AccountingNavChild[] };

function linkActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/accounting" && pathname.startsWith(href))
  );
}

function ExpensesNavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: AccountingNavChild[];
  pathname: string;
}) {
  const childActive = items.some((c) => linkActive(pathname, c.href));
  const [expanded, setExpanded] = useState(childActive);

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive, pathname]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!childActive) setExpanded(false);
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-left text-sm transition ${
          childActive
            ? "bg-white/15 font-medium text-white"
            : "text-slate-200 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{label}</span>
        <span
          className={`text-xs text-slate-400 transition ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        >
          ›
        </span>
      </button>
      {expanded ? (
        <div className="mt-0.5 ml-3 space-y-0.5 border-l border-white/15 pl-2">
          {items.map((c) => {
            const active = linkActive(pathname, c.href);
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`block rounded px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/15 font-medium text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AccountingAppShell({
  name,
  links,
  children,
}: {
  name: string;
  links: AccountingNavItem[];
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
              aria-controls="accounting-sidebar"
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
                Accounting Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm sm:gap-4">
            <span className="hidden text-slate-300 sm:inline">
              {name} ·{" "}
              <span className="capitalize text-[#d4a574]">accounting</span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded border border-slate-500 px-3 py-1.5 hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
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
        id="accounting-sidebar"
        className={`fixed bottom-0 left-0 top-[4.75rem] z-40 flex w-64 flex-col border-r border-slate-800/10 bg-[#0c1f2e] text-[#f3efe6] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
          aria-label="Accounting"
        >
          {links.map((item) => {
            if (item.children) {
              return (
                <ExpensesNavGroup
                  key={item.label}
                  label={item.label}
                  items={item.children}
                  pathname={pathname}
                />
              );
            }

            const active = linkActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-white/15 font-medium text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
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
