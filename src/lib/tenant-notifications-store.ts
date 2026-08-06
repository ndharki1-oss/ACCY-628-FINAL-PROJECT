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
const DISMISSED_IDS_KEY = "harborline.tenant.dismissed-notifications";

const DERIVED_PREFIXES = ["checkout-", "msg-waiting-"] as const;

function loadDismissedNotificationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(DISMISSED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDismissedNotificationIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    DISMISSED_IDS_KEY,
    JSON.stringify(ids.slice(0, 100))
  );
}

function isDismissedNotificationId(id: string) {
  return loadDismissedNotificationIds().includes(id);
}

export function dismissTenantNotification(id: string) {
  if (typeof window === "undefined") return;
  const remaining = loadTenantNotifications().filter((n) => n.id !== id);
  saveTenantNotifications(remaining);

  const dismissed = new Set(loadDismissedNotificationIds());
  dismissed.add(id);
  saveDismissedNotificationIds([...dismissed]);
}

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

/** Demo notifications for the tenant portal (stable ids; seeded once per session). */
export const EXAMPLE_TENANT_NOTIFICATIONS: Omit<
  TenantNotification,
  "sentAt" | "read"
>[] = [
  {
    id: "example-invoice-due",
    fromRole: "system",
    fromName: "Harborline Billing",
    subject: "Invoice payment reminder",
    preview:
      "You have an open invoice ready to review. Open View & Pay Invoices to pay by property.",
    href: "/tenant/invoices",
  },
  {
    id: "example-maintenance-update",
    fromRole: "admin",
    fromName: "Avery Morgan",
    subject: "Maintenance request update",
    preview:
      "Your HVAC service request is in progress. A technician is scheduled for this week.",
    href: "/tenant/requests",
  },
  {
    id: "example-contact-message",
    fromRole: "owner",
    fromName: "Olivia Bennett",
    subject: "Message from ownership",
    preview:
      "We left a note on Contact Management about renewal timing. Please take a look when you can.",
    href: "/tenant/contact",
  },
  {
    id: "example-available-lease",
    fromRole: "system",
    fromName: "Harborline",
    subject: "New available lease listing",
    preview:
      "A vacant suite matching your network is listed under Available Leases.",
    href: "/tenant/available",
  },
];

const EXAMPLE_SEEDED_KEY = "harborline.tenant.example-notifications-seeded";

/** Push example tenant notifications once per browser session. */
export function seedExampleTenantNotifications() {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(EXAMPLE_SEEDED_KEY) === "1") return;

  const existing = loadTenantNotifications();
  const existingIds = new Set(existing.map((n) => n.id));
  const stamped = new Date().toLocaleString();
  const examples = EXAMPLE_TENANT_NOTIFICATIONS.filter(
    (n) => !existingIds.has(n.id) && !isDismissedNotificationId(n.id)
  ).map((n) => ({
    ...n,
    sentAt: stamped,
    read: false,
  }));

  if (examples.length > 0) {
    saveTenantNotifications([...examples, ...existing].slice(0, 20));
  }
  window.sessionStorage.setItem(EXAMPLE_SEEDED_KEY, "1");
}

/** Sync lease-checkout and waiting-message notifications from server hints. */
export function syncDerivedTenantNotifications(input: {
  checkoutLeases: CheckoutLeaseHint[];
  waitingMessage: WaitingMessageHint | null;
}) {
  if (typeof window === "undefined") return;

  const existing = loadTenantNotifications();
  const keep = existing.filter((n) => !isDerivedId(n.id));

  const dismissed = new Set(loadDismissedNotificationIds());

  const derived: TenantNotification[] = input.checkoutLeases
    .map((lease) => {
      const id = `checkout-${lease.leaseId}`;
      if (dismissed.has(id)) return null;
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
    })
    .filter((n): n is TenantNotification => n != null);

  if (input.waitingMessage) {
    const msg = input.waitingMessage;
    const id = `msg-waiting-${msg.messageId}`;
    if (!dismissed.has(id)) {
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
  }

  saveTenantNotifications([...derived, ...keep].slice(0, 20));
}

/** Resolve a portal path for a notification (including older items without href). */
export function hrefForTenantNotification(n: TenantNotification): string | null {
  if (n.href) return n.href;
  if (n.id.startsWith("checkout-")) return "/tenant/lease";
  if (n.id.startsWith("msg-waiting-")) return "/tenant/contact";
  if (n.id.startsWith("example-invoice")) return "/tenant/invoices";
  if (n.id.startsWith("example-maintenance")) return "/tenant/requests";
  if (n.id.startsWith("example-contact")) return "/tenant/contact";
  if (n.id.startsWith("example-available")) return "/tenant/available";
  if (n.subject.toLowerCase().includes("invoice") || n.subject.toLowerCase().includes("payment")) {
    return "/tenant/invoices";
  }
  if (n.subject.toLowerCase().includes("maintenance")) return "/tenant/requests";
  if (n.subject.toLowerCase().includes("message")) return "/tenant/contact";
  if (n.subject.toLowerCase().includes("available")) return "/tenant/available";
  if (n.subject.toLowerCase().includes("check-out") || n.subject.toLowerCase().includes("checkout")) {
    return "/tenant/lease";
  }
  return null;
}
