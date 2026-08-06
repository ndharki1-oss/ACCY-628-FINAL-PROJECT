export type EmployeeNotification = {
  id: string;
  fromRole: "admin" | "system";
  fromName: string;
  subject: string;
  preview: string;
  sentAt: string;
  read: boolean;
  /** Employee-portal path to open when the notification is clicked. */
  href?: string;
};

export type AssignmentHint = {
  id: string;
  woNumber: string;
  title: string;
  propertyName: string;
  status: string;
  scheduledDate: string | null;
};

export const EMPLOYEE_NOTIFICATIONS_KEY = "harborline.employee.notifications";
export const EMPLOYEE_NOTIFICATIONS_EVENT = "harborline:employee-notifications";
const DISMISSED_IDS_KEY = "harborline.employee.dismissed-notifications";
const EXAMPLE_SEEDED_KEY = "harborline.employee.example-notifications-seeded";

const DERIVED_PREFIX = "assignment-";

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

export function dismissEmployeeNotification(id: string) {
  if (typeof window === "undefined") return;
  const remaining = loadEmployeeNotifications().filter((n) => n.id !== id);
  saveEmployeeNotifications(remaining);

  const dismissed = new Set(loadDismissedNotificationIds());
  dismissed.add(id);
  saveDismissedNotificationIds([...dismissed]);
}

export function loadEmployeeNotifications(): EmployeeNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(EMPLOYEE_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmployeeNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEmployeeNotifications(items: EmployeeNotification[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    EMPLOYEE_NOTIFICATIONS_KEY,
    JSON.stringify(items)
  );
  window.dispatchEvent(new Event(EMPLOYEE_NOTIFICATIONS_EVENT));
}

export function pushEmployeeNotification(
  input: Omit<EmployeeNotification, "id" | "sentAt" | "read"> & {
    id?: string;
    sentAt?: string;
    read?: boolean;
    href?: string;
  }
) {
  const next: EmployeeNotification = {
    id: input.id ?? crypto.randomUUID(),
    fromRole: input.fromRole,
    fromName: input.fromName,
    subject: input.subject,
    preview: input.preview,
    sentAt: input.sentAt ?? new Date().toLocaleString(),
    read: input.read ?? false,
    href: input.href,
  };
  const existing = loadEmployeeNotifications().filter((n) => n.id !== next.id);
  saveEmployeeNotifications([next, ...existing].slice(0, 20));
  return next;
}

/** Demo notifications for the employee portal (stable ids; seeded once per session). */
export const EXAMPLE_EMPLOYEE_NOTIFICATIONS: Omit<
  EmployeeNotification,
  "sentAt" | "read"
>[] = [
  {
    id: "example-employee-assignment",
    fromRole: "admin",
    fromName: "Harborline Management",
    subject: "New assignment waiting",
    preview:
      "You have an open work order on Assignments. Review details and mark complete when finished.",
    href: "/employee/work-orders#assignments-open",
  },
  {
    id: "example-employee-schedule",
    fromRole: "system",
    fromName: "Harborline",
    subject: "Scheduled work reminder",
    preview:
      "Check Assignments for jobs with upcoming scheduled dates on your route.",
    href: "/employee/work-orders#assignments-open",
  },
];

/** Push example employee notifications once per browser session. */
export function seedExampleEmployeeNotifications() {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(EXAMPLE_SEEDED_KEY) === "1") return;

  const existing = loadEmployeeNotifications();
  const existingIds = new Set(existing.map((n) => n.id));
  const stamped = new Date().toLocaleString();
  const examples = EXAMPLE_EMPLOYEE_NOTIFICATIONS.filter(
    (n) => !existingIds.has(n.id) && !isDismissedNotificationId(n.id)
  ).map((n) => ({
    ...n,
    sentAt: stamped,
    read: false,
  }));

  if (examples.length > 0) {
    saveEmployeeNotifications([...examples, ...existing].slice(0, 20));
  }
  window.sessionStorage.setItem(EXAMPLE_SEEDED_KEY, "1");
}

/** Sync assignment notifications from server hints. */
export function syncDerivedEmployeeNotifications(hints: AssignmentHint[]) {
  if (typeof window === "undefined") return;

  const existing = loadEmployeeNotifications();
  const keep = existing.filter((n) => !n.id.startsWith(DERIVED_PREFIX));
  const dismissed = new Set(loadDismissedNotificationIds());

  const derived: EmployeeNotification[] = hints
    .map((hint): EmployeeNotification | null => {
      const id = `${DERIVED_PREFIX}${hint.id}`;
      if (dismissed.has(id)) return null;
      const prev = existing.find((n) => n.id === id);
      const schedule = hint.scheduledDate
        ? ` · scheduled ${hint.scheduledDate}`
        : "";
      return {
        id,
        fromRole: "admin",
        fromName: "Harborline Management",
        subject: `Assignment ${hint.woNumber}`,
        preview: `${hint.title} at ${hint.propertyName}${schedule} · ${hint.status.replaceAll("_", " ")}`,
        sentAt: prev?.sentAt ?? new Date().toLocaleString(),
        read: prev?.read ?? false,
        href: `/employee/work-orders#assignment-${hint.id}`,
      };
    })
    .filter((n): n is EmployeeNotification => n != null);

  saveEmployeeNotifications([...derived, ...keep].slice(0, 20));
}

/** Resolve a portal path for a notification. */
export function hrefForEmployeeNotification(
  n: EmployeeNotification
): string | null {
  if (n.href) return n.href;
  if (n.id.startsWith(DERIVED_PREFIX)) {
    const woId = n.id.slice(DERIVED_PREFIX.length);
    return `/employee/work-orders#assignment-${woId}`;
  }
  return "/employee/work-orders#assignments-open";
}
