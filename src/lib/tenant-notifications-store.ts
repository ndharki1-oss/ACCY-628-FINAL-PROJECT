export type TenantNotification = {
  id: string;
  fromRole: "admin" | "owner" | "system";
  fromName: string;
  subject: string;
  preview: string;
  sentAt: string;
  read: boolean;
  /** Tenant-portal path to open when the notification is clicked. */
  href?: string;
};

export type CheckoutLeaseHint = {
  leaseId: string;
  leaseNumber: string;
  endDate: string;
  propertyName: string;
  daysLeft: number;
};

export type WaitingMessageHint = {
  messageId: string;
  senderName: string;
  senderRole: "admin" | "owner";
  preview: string;
  sentAt: string;
};

export const TENANT_NOTIFICATIONS_KEY = "harborline.tenant.notifications";
export const TENANT_NOTIFICATIONS_EVENT = "harborline:tenant-notifications";

const DERIVED_PREFIXES = ["checkout-", "msg-waiting-"] as const;

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
    href?: string;
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
    href: input.href,
  };
  const existing = loadTenantNotifications().filter((n) => n.id !== next.id);
  saveTenantNotifications([next, ...existing].slice(0, 20));
  return next;
}

export function markAllTenantNotificationsRead() {
  const items = loadTenantNotifications().map((n) => ({ ...n, read: true }));
  saveTenantNotifications(items);
}

function isDerivedId(id: string) {
  return DERIVED_PREFIXES.some((p) => id.startsWith(p));
}

/** Sync lease-checkout and waiting-message notifications from server hints. */
export function syncDerivedTenantNotifications(input: {
  checkoutLeases: CheckoutLeaseHint[];
  waitingMessage: WaitingMessageHint | null;
}) {
  if (typeof window === "undefined") return;

  const existing = loadTenantNotifications();
  const keep = existing.filter((n) => !isDerivedId(n.id));

  const derived: TenantNotification[] = input.checkoutLeases.map((lease) => {
    const id = `checkout-${lease.leaseId}`;
    const prev = existing.find((n) => n.id === id);
    const daysLabel =
      lease.daysLeft === 0
        ? "today"
        : lease.daysLeft === 1
          ? "1 day"
          : `${lease.daysLeft} days`;
    return {
      id,
      fromRole: "system" as const,
      fromName: "Harborline",
      subject: "Check-out list due soon",
      preview: `Your lease ${lease.leaseNumber} at ${lease.propertyName} ends in ${daysLabel} (${lease.endDate}). Please fill out your Check Out list before move-out.`,
      sentAt: prev?.sentAt ?? new Date().toLocaleString(),
      read: prev?.read ?? false,
      href: "/tenant/lease",
    };
  });

  if (input.waitingMessage) {
    const msg = input.waitingMessage;
    const id = `msg-waiting-${msg.messageId}`;
    const prev = existing.find((n) => n.id === id);
    derived.push({
      id,
      fromRole: msg.senderRole,
      fromName: msg.senderName,
      subject: "Message waiting for you",
      preview: `You have a new message on the Contact Management board: ${msg.preview}`,
      sentAt: prev?.sentAt ?? msg.sentAt,
      read: prev?.read ?? false,
      href: "/tenant/contact",
    });
  }

  saveTenantNotifications([...derived, ...keep].slice(0, 20));
}

/** Resolve a portal path for a notification (including older items without href). */
export function hrefForTenantNotification(n: TenantNotification): string | null {
  if (n.href) return n.href;
  if (n.id.startsWith("checkout-")) return "/tenant/lease";
  if (n.id.startsWith("msg-waiting-")) return "/tenant/contact";
  if (n.subject.toLowerCase().includes("maintenance")) return "/tenant/requests";
  if (n.subject.toLowerCase().includes("message")) return "/tenant/contact";
  if (n.subject.toLowerCase().includes("check-out") || n.subject.toLowerCase().includes("checkout")) {
    return "/tenant/lease";
  }
  return null;
}
