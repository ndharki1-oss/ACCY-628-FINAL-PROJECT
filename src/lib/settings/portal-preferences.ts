import type { PortalRole } from "@/lib/help/faq-data";

export type PortalPreferences = {
  defaultNoiRange?: "month" | "quarter" | "ytd";
  expandActionNeeded?: boolean;
  showSinceLastVisit?: boolean;
  landingHint?: string;
};

function storageKey(role: PortalRole) {
  return `harborline.prefs.${role}`;
}

export function readPortalPreferences(role: PortalRole): PortalPreferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(role));
    if (!raw) return {};
    return JSON.parse(raw) as PortalPreferences;
  } catch {
    return {};
  }
}

export function writePortalPreferences(
  role: PortalRole,
  prefs: PortalPreferences
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(role), JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function clearPortalPreferences(role: PortalRole) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(role));
  } catch {
    // ignore
  }
}
