"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type AppShellNavChild = { href: string; label: string };

export type AppShellNavItem =
  | { href: string; label: string; children?: undefined }
  | { label: string; href?: undefined; children: AppShellNavChild[] };

function linkActive(pathname: string, href: string, homeHref: string) {
  return (
    pathname === href || (href !== homeHref && pathname.startsWith(href))
  );
}

function NavGroup({
  label,
  items,
  pathname,
  homeHref,
}: {
  label: string;
  items: AppShellNavChild[];
  pathname: string;
  homeHref: string;
}) {
  const childActive = items.some((c) => linkActive(pathname, c.href, homeHref));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    // Defer so the opening click does not immediately close the menu.
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("keydown", onKey);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-3 py-1.5 text-sm transition ${
          childActive || open
            ? "bg-white/15 font-medium text-white"
            : "text-slate-200 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{label}</span>
        <span
          className={`text-[0.65rem] text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-[60] min-w-[12rem] rounded-md border border-slate-600/70 bg-[#0c1f2e] py-1 shadow-xl"
        >
          {items.map((c) => {
            const active = linkActive(pathname, c.href, homeHref);
            return (
              <Link
                key={c.href}
                href={c.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`block whitespace-nowrap px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/15 font-medium text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
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

export function AppShellNav({
  links,
  homeHref,
}: {
  links: AppShellNavItem[];
  homeHref: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="relative z-50 mx-auto flex max-w-7xl flex-wrap gap-1 overflow-visible px-4 pb-3 sm:px-6"
      aria-label="Admin"
    >
      {links.map((item) => {
        if (item.children) {
          return (
            <NavGroup
              key={item.label}
              label={item.label}
              items={item.children}
              pathname={pathname}
              homeHref={homeHref}
            />
          );
        }

        const active = linkActive(pathname, item.href, homeHref);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-sm transition ${
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
  );
}
