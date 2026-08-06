"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { roleHomePath } from "@/lib/utils";

export type DemoRoleKey =
  | "admin"
  | "owner"
  | "tenant"
  | "vendor"
  | "accounting";

const DEMO_ACCOUNTS: {
  key: DemoRoleKey;
  label: string;
  email: string;
}[] = [
  {
    key: "admin",
    label: "Property Manager",
    email: "admin@example.com",
  },
  {
    key: "owner",
    label: "Owner",
    email: "owner@example.com",
  },
  {
    key: "tenant",
    label: "Tenant",
    email: "tenant@example.com",
  },
  {
    key: "vendor",
    label: "Employee",
    email: "employee@example.com",
  },
  {
    key: "accounting",
    label: "Accounting",
    email: "accounting@example.com",
  },
];

function accountForKey(key: DemoRoleKey) {
  return DEMO_ACCOUNTS.find((a) => a.key === key)!;
}

export function DemoRoleSwitcher({
  currentRole,
  className = "",
}: {
  currentRole: DemoRoleKey;
  className?: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [pendingKey, setPendingKey] = useState<DemoRoleKey | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectValue, setSelectValue] = useState<DemoRoleKey>(currentRole);

  useEffect(() => {
    setSelectValue(currentRole);
  }, [currentRole]);

  useEffect(() => {
    if (pendingKey) {
      passwordRef.current?.focus();
    }
  }, [pendingKey]);

  function closeModal() {
    setPendingKey(null);
    setPassword("");
    setLoading(false);
    setSelectValue(currentRole);
  }

  function onSelectChange(next: DemoRoleKey) {
    setSelectValue(next);
    if (next === currentRole) return;
    setPendingKey(next);
    setPassword("");
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingKey || loading) return;

    const target = accountForKey(pendingKey);
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: target.email,
      password,
    });

    if (authError) {
      setLoading(false);
      setPendingKey(null);
      setPassword("");
      setSelectValue(currentRole);
      router.replace(
        `/login?error=${encodeURIComponent(
          `Role switch failed: ${authError.message}`
        )}`
      );
      return;
    }

    setPendingKey(null);
    router.push(roleHomePath(pendingKey));
    router.refresh();
  }

  const current = accountForKey(currentRole);
  const pending = pendingKey ? accountForKey(pendingKey) : null;

  return (
    <>
      <span className={`text-slate-300 ${className}`.trim()}>
        <label className="inline-flex items-center gap-1">
          <span className="sr-only">Switch demo role</span>
          <select
            aria-label="Switch demo role"
            value={selectValue}
            disabled={loading || pendingKey != null}
            onChange={(e) => onSelectChange(e.target.value as DemoRoleKey)}
            className="max-w-[11rem] cursor-pointer appearance-none border-0 bg-transparent py-0.5 pr-5 text-[#d4a574] outline-none focus:ring-1 focus:ring-[#d4a574]/50"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23d4a574' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.15rem center",
            }}
          >
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.key} value={a.key} className="bg-[#0c1f2e] text-[#f3efe6]">
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </span>

      {pending ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c1f2e]/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !loading) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-lg border border-slate-800/15 bg-[#f4f1ea] p-5 text-slate-900 shadow-lg"
          >
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]"
            >
              Switch to {pending.label}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter the demo password to sign in as{" "}
              <span className="font-medium text-slate-800">{pending.email}</span>
              . Current: {current.label}.
            </p>
            <form onSubmit={onConfirm} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="demo-role-password"
                  className="block text-xs font-medium uppercase tracking-wider text-slate-500"
                >
                  Password
                </label>
                <input
                  ref={passwordRef}
                  id="demo-role-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0c1f2e] focus:ring-1 focus:ring-[#0c1f2e]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={closeModal}
                  className="rounded border border-slate-400 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="rounded bg-[#0c1f2e] px-3 py-1.5 text-sm text-[#f3efe6] hover:bg-[#163247] disabled:opacity-50"
                >
                  {loading ? "Switching…" : "Switch role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
