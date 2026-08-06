const STORAGE_PREFIX = "harborline.owner.lastVisitAt.";

export function lastVisitStorageKey(ownerId: string) {
  return `${STORAGE_PREFIX}${ownerId}`;
}

export function readLastVisitAt(ownerId: string): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lastVisitStorageKey(ownerId));
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function writeLastVisitAt(ownerId: string, when: Date = new Date()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      lastVisitStorageKey(ownerId),
      when.toISOString()
    );
  } catch {
    // Private mode / blocked storage — banner still works without a stamp.
  }
}

export function formatLastVisitLabel(when: Date) {
  return when.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
