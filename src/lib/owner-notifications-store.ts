export type OwnerNotification = {
  id: string;
  fromRole: "admin" | "system" | "tenant";
  fromName: string;
  subject: string;
  preview: string;
  sentAt: string;
  read: boolean;
  /** Owner-portal path to open when the notification is clicked. */
  href?: string;
};

export type OwnerItemHint = {
  id: string;
  kind: "cost" | "work-order" | "request" | "overdue" | "expiration" | "message";
  title: string;
  preview: string;
};

export type OwnerContactMessageHint = {
  messageId: string;
  senderName: string;
  senderRole: "admin" | "system";
  preview: string;
  sentAt: string;
};

export const OWNER_NOTIFICATIONS_KEY = "harborline.owner.notifications";
export const OWNER_NOTIFICATIONS_EVENT = "harborline:owner-notifications";
const DISMISSED_IDS_KEY = "harborline.owner.dismissed-notifications";
const EXAMPLE_SEEDED_KEY = "harborline.owner.example-notifications-seeded";

const DERIVED_PREFIX = "item-";
const MAX_STORED = 50;

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

export function dismissOwnerNotification(id: string) {
  if (typeof window === "undefined") return;
  const remaining = loadOwnerNotifications().filter((n) => n.id !== id);
  saveOwnerNotifications(remaining);

  const dismissed = new Set(loadDismissedNotificationIds());
  dismissed.add(id);
  saveDismissedNotificationIds([...dismissed]);
}

export function loadOwnerNotifications(): OwnerNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(OWNER_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OwnerNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOwnerNotifications(items: OwnerNotification[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(OWNER_NOTIFICATIONS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(OWNER_NOTIFICATIONS_EVENT));
}

export function pushOwnerNotification(
  input: Omit<OwnerNotification, "id" | "sentAt" | "read"> & {
    id?: string;
    sentAt?: string;
    read?: boolean;
    href?: string;
  }
) {
  const next: OwnerNotification = {
    id: input.id ?? crypto.randomUUID(),
    fromRole: input.fromRole,
    fromName: input.fromName,
    subject: input.subject,
    preview: input.preview,
    sentAt: input.sentAt ?? new Date().toLocaleString(),
    read: input.read ?? false,
    href: input.href,
  };
  const existing = loadOwnerNotifications().filter((n) => n.id !== next.id);
  saveOwnerNotifications([next, ...existing].slice(0, MAX_STORED));
  return next;
}

function hrefForItemKind(kind: OwnerItemHint["kind"]) {
  switch (kind) {
    case "cost":
      return "/owner/items#my-items-costs";
    case "work-order":
      return "/owner/items#my-items-work-orders";
    case "request":
      return "/owner/items#my-items-requests";
    case "overdue":
      return "/owner/items#my-items-overdue";
    case "expiration":
      return "/owner/items#my-items-expirations";
    case "message":
      return "/owner/contact";
  }
}

function roleForKind(
  kind: OwnerItemHint["kind"]
): OwnerNotification["fromRole"] {
  if (kind === "request") return "tenant";
  if (kind === "overdue" || kind === "expiration") return "system";
  return "admin";
}

function nameForKind(kind: OwnerItemHint["kind"]) {
  if (kind === "request") return "Tenant";
  if (kind === "overdue" || kind === "expiration") return "Harborline";
  return "Harborline Management";
}

function isDerivedId(id: string) {
  return id.startsWith(DERIVED_PREFIX) || id.startsWith("msg-waiting-");
}

/** Demo notifications for the owner portal (stable ids; seeded once per session). */
export const EXAMPLE_OWNER_NOTIFICATIONS: Omit<
  OwnerNotification,
  "sentAt" | "read"
>[] = [
  {
    id: "example-owner-cost",
    fromRole: "admin",
    fromName: "Harborline Management",
    subject: "Cost awaiting your approval",
    preview:
      "A property cost over your approval threshold is waiting on My Items.",
    href: "/owner/items#my-items-costs",
  },
  {
    id: "example-owner-work-order",
    fromRole: "admin",
    fromName: "Harborline Management",
    subject: "Work order needs your decision",
    preview:
      "A work order over threshold is pending approval. Review it on My Items.",
    href: "/owner/items#my-items-work-orders",
  },
  {
    id: "example-owner-overdue",
    fromRole: "system",
    fromName: "Harborline Billing",
    subject: "Overdue rent on your portfolio",
    preview:
      "One or more tenant invoices are overdue. Open My Items to review balances.",
    href: "/owner/items#my-items-overdue",
  },
];

/** Push example owner notifications once per browser session. */
export function seedExampleOwnerNotifications() {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(EXAMPLE_SEEDED_KEY) === "1") return;

  const existing = loadOwnerNotifications();
  const existingIds = new Set(existing.map((n) => n.id));
  const stamped = new Date().toLocaleString();
  const examples = EXAMPLE_OWNER_NOTIFICATIONS.filter(
    (n) => !existingIds.has(n.id) && !isDismissedNotificationId(n.id)
  ).map((n) => ({
    ...n,
    sentAt: stamped,
    read: false,
  }));

  if (examples.length > 0) {
    saveOwnerNotifications([...examples, ...existing].slice(0, MAX_STORED));
  }
  window.sessionStorage.setItem(EXAMPLE_SEEDED_KEY, "1");
}

/** Sync My Items + Contact Management notifications from server hints. */
export function syncDerivedOwnerNotifications(input: {
  itemHints: OwnerItemHint[];
  contactMessages?: OwnerContactMessageHint[];
}) {
  if (typeof window === "undefined") return;

  const existing = loadOwnerNotifications();
  const keep = existing.filter((n) => !isDerivedId(n.id));
  const dismissed = new Set(loadDismissedNotificationIds());

  const derived: OwnerNotification[] = input.itemHints
    .map((hint): OwnerNotification | null => {
      const id = `${DERIVED_PREFIX}${hint.kind}-${hint.id}`;
      if (dismissed.has(id)) return null;
      const prev = existing.find((n) => n.id === id);
      return {
        id,
        fromRole: roleForKind(hint.kind),
        fromName: nameForKind(hint.kind),
        subject: hint.title,
        preview: hint.preview,
        sentAt: prev?.sentAt ?? new Date().toLocaleString(),
        read: prev?.read ?? false,
        href: hrefForItemKind(hint.kind),
      };
    })
    .filter((n): n is OwnerNotification => n != null);

  for (const msg of input.contactMessages ?? []) {
    const id = `msg-waiting-${msg.messageId}`;
    if (dismissed.has(id)) continue;
    const prev = existing.find((n) => n.id === id);
    derived.push({
      id,
      fromRole: msg.senderRole === "admin" ? "admin" : "system",
      fromName: msg.senderName,
      subject: "Message waiting for you",
      preview: `You have a new message on Contact Management: ${msg.preview}`,
      sentAt: prev?.sentAt ?? msg.sentAt,
      read: prev?.read ?? false,
      href: "/owner/contact",
    });
  }

  saveOwnerNotifications([...derived, ...keep].slice(0, MAX_STORED));
}

/** Resolve a portal path for a notification (including older items without href). */
export function hrefForOwnerNotification(n: OwnerNotification): string | null {
  if (n.href) return n.href;
  if (n.id.includes("cost")) return "/owner/items#my-items-costs";
  if (n.id.includes("work-order") || n.id.includes("work_order")) {
    return "/owner/items#my-items-work-orders";
  }
  if (n.id.includes("request")) return "/owner/items#my-items-requests";
  if (n.id.includes("overdue")) return "/owner/items#my-items-overdue";
  if (n.id.includes("expiration")) return "/owner/items#my-items-expirations";
  if (n.id.startsWith("msg-waiting-") || n.id.includes("message")) {
    return "/owner/contact";
  }
  if (n.subject.toLowerCase().includes("message")) return "/owner/contact";
  if (n.subject.toLowerCase().includes("cost")) {
    return "/owner/items#my-items-costs";
  }
  if (n.subject.toLowerCase().includes("work order")) {
    return "/owner/items#my-items-work-orders";
  }
  if (n.subject.toLowerCase().includes("request")) {
    return "/owner/items#my-items-requests";
  }
  if (n.subject.toLowerCase().includes("overdue")) {
    return "/owner/items#my-items-overdue";
  }
  if (n.subject.toLowerCase().includes("expir")) {
    return "/owner/items#my-items-expirations";
  }
  return "/owner/items";
}
