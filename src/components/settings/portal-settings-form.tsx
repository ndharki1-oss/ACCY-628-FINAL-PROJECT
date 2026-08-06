"use client";

import { useEffect, useState } from "react";
import type { PortalRole } from "@/lib/help/faq-data";
import {
  clearPortalPreferences,
  readPortalPreferences,
  writePortalPreferences,
  type PortalPreferences,
} from "@/lib/settings/portal-preferences";

export function PortalSettingsForm({
  role,
  landingOptions,
}: {
  role: PortalRole;
  landingOptions: { value: string; label: string }[];
}) {
  const [prefs, setPrefs] = useState<PortalPreferences>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(readPortalPreferences(role));
  }, [role]);

  function save(next: PortalPreferences) {
    setPrefs(next);
    writePortalPreferences(role, next);
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white/90 p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0c1f2e]">
          Display Preferences
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Stored on this browser only (not shared to the database).
        </p>

        <label className="mt-4 block text-sm font-medium text-[#0c1f2e]">
          Preferred Landing Area
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={prefs.landingHint ?? landingOptions[0]?.value ?? ""}
            onChange={(e) =>
              save({ ...prefs, landingHint: e.target.value || undefined })
            }
          >
            {landingOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {role === "owner" ? (
          <>
            <label className="mt-4 block text-sm font-medium text-[#0c1f2e]">
              Default NOI period
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={prefs.defaultNoiRange ?? "month"}
                onChange={(e) =>
                  save({
                    ...prefs,
                    defaultNoiRange: e.target.value as
                      | "month"
                      | "quarter"
                      | "ytd",
                  })
                }
              >
                <option value="month">This month</option>
                <option value="quarter">This quarter</option>
                <option value="ytd">Year to date</option>
              </select>
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm text-[#0c1f2e]">
              <input
                type="checkbox"
                checked={prefs.expandActionNeeded ?? true}
                onChange={(e) =>
                  save({ ...prefs, expandActionNeeded: e.target.checked })
                }
              />
              Prefer Action needed sections expanded
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm text-[#0c1f2e]">
              <input
                type="checkbox"
                checked={prefs.showSinceLastVisit ?? true}
                onChange={(e) =>
                  save({ ...prefs, showSinceLastVisit: e.target.checked })
                }
              />
              Show “since last visit” style reminders when available
            </label>
          </>
        ) : null}

        {savedAt ? (
          <p className="mt-4 text-xs text-emerald-800">Saved locally at {savedAt}</p>
        ) : null}

        <button
          type="button"
          className="mt-4 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => {
            clearPortalPreferences(role);
            setPrefs({});
            setSavedAt(new Date().toLocaleTimeString());
          }}
        >
          Reset Preferences
        </button>
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Account
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Password and profile edits are managed by Harborline administrators for
          this demo. Use Sign Out from the menu when finished.
        </p>
      </section>
    </div>
  );
}
