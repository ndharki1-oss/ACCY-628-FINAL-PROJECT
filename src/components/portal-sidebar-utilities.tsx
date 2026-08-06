"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

export function PortalSidebarUtilities({
  helpHref,
  settingsHref,
}: {
  helpHref?: string;
  settingsHref: string;
}) {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `rounded px-3 py-2.5 text-sm transition ${
      active
        ? "bg-white/15 font-medium text-white"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;
  };

  return (
    <div className="mt-auto border-t border-white/10 p-3">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Account
      </p>
      <div className="flex flex-col gap-1">
        {helpHref ? (
          <Link href={helpHref} className={linkClass(helpHref)}>
            Help
          </Link>
        ) : null}
        <Link href={settingsHref} className={linkClass(settingsHref)}>
          Settings
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
