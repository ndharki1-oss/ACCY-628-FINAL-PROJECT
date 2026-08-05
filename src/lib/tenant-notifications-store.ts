export type TenantNotification = {
  id: string;
  fromRole: "admin" | "owner" | "system";
  fromName: string;
  subject: string;
  preview: string;
  sentAt: string;
  read: boolean;
};

export const TENANT_NOTIFICATIONS_KEY = "harborline.tenant.notifications";
export const TENANT_NOTIFICATIONS_EVENT = "harborline:tenant-notifications";

export function loadTenantNotifications(): TenantNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(TENANT_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TenantNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTenantNotifications(items: TenantNotification[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TENANT_NOTIFICATIONS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(TENANT_NOTIFICATIONS_EVENT));
}

export function pushTenantNotification(
  input: Omit<TenantNotification, "id" | "sentAt" | "read"> & {
    id?: string;
    sentAt?: string;
    read?: boolean;
  }
) {
  const next: TenantNotification = {
    id: input.id ?? crypto.randomUUID(),
    fromRole: input.fromRole,
    fromName: input.fromName,
    subject: input.subject,
    preview: input.preview,
    sentAt: input.sentAt ?? new Date().toLocaleString(),
    read: input.read ?? false,
  };
  const existing = loadTenantNotifications().filter((n) => n.id !== next.id);
  saveTenantNotifications([next, ...existing].slice(0, 20));
  return next;
}

export function markAllTenantNotificationsRead() {
  const items = loadTenantNotifications().map((n) => ({ ...n, read: true }));
  saveTenantNotifications(items);
}
