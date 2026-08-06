import { logout } from "@/app/actions/auth";
import {
  AppShellNav,
  type AppShellNavItem,
} from "@/components/app-shell-nav";
import {
  DemoRoleSwitcher,
  type DemoRoleKey,
} from "@/components/demo-role-switcher";
import { statusClass } from "@/lib/utils";

const nav: Record<string, AppShellNavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard" },
    {
      label: "Portfolio",
      children: [
        { href: "/admin/properties", label: "Properties" },
        { href: "/admin/owners", label: "Property Owners" },
        { href: "/admin/leases", label: "Leases" },
        { href: "/admin/deposits", label: "Deposits" },
      ],
    },
    {
      label: "Billing",
      children: [
        { href: "/admin/billing", label: "Billing" },
        { href: "/admin/statements", label: "Statements" },
      ],
    },
    { href: "/admin/work-orders", label: "Work Orders" },
    {
      label: "Profitability",
      children: [
        { href: "/admin/profitability", label: "Mgmt P&L" },
        { href: "/admin/reports/property-pnl", label: "Property P&L" },
        {
          href: "/admin/reports/owner-profitability",
          label: "Owner Profit",
        },
      ],
    },
    {
      label: "Expenses",
      children: [
        { href: "/admin/reports/maintenance", label: "Maintenance" },
        { href: "/admin/reports/employee-labor", label: "Labor" },
        { href: "/admin/reports/expense-breakdown", label: "Expenses" },
      ],
    },
  ],
  owner: [
    { href: "/owner", label: "Dashboard" },
    { href: "/owner/properties", label: "Properties" },
    { href: "/owner/items", label: "My Items" },
    { href: "/owner/statements", label: "Statements" },
    { href: "/owner/noi", label: "NOI" },
  ],
  tenant: [
    { href: "/tenant", label: "Dashboard" },
    { href: "/tenant/lease", label: "My Lease" },
    { href: "/tenant/invoices", label: "Invoices" },
    { href: "/tenant/requests", label: "Requests" },
  ],
};

const homeHrefByRole: Record<string, string> = {
  admin: "/admin",
  owner: "/owner",
  tenant: "/tenant",
};

export function AppShell({
  role,
  name,
  children,
}: {
  role: string;
  name: string;
  children: React.ReactNode;
}) {
  const links = nav[role] ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8eef5_0%,_#f4f1ea_45%,_#ebe6dc_100%)] text-slate-900">
      <header className="relative z-40 overflow-visible border-b border-slate-800/10 bg-[#0c1f2e] text-[#f3efe6]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl tracking-tight sm:text-2xl">
              Harborline
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
              Commercial Management
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-300">
              {name} ·{" "}
              <DemoRoleSwitcher currentRole={role as DemoRoleKey} />
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded border border-slate-500 px-3 py-1.5 hover:bg-white/10"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
        <AppShellNav
          links={links}
          homeHref={homeHrefByRole[role] ?? `/${role}`}
        />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function Card({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-800/10 bg-white/80 p-5 shadow-sm backdrop-blur ${className}`.trim()}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800/10 bg-[#0c1f2e] p-4 text-[#f3efe6]">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const label =
    status === "pending_owner_approval"
      ? "Needs your approval"
      : status.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex h-fit shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none capitalize tracking-wide whitespace-nowrap ${statusClass(status)}`}
    >
      {label}
    </span>
  );
}
