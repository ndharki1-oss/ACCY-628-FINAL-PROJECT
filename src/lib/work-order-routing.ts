export const DEFAULT_APPROVAL_THRESHOLD = 2500;

/** Demo employee login (employee@example.com) → Chen Building Services */
export const DEMO_EMPLOYEE_VENDOR_ID =
  "50000000-0000-0000-0000-000000000001";

export type Priority = "Emergency" | "High" | "Medium" | "Low";

export type WorkOrderDestination =
  | "property_manager"
  | "property_owner"
  | "employee"
  | "completed";

export type WorkOrderRouting = {
  priority: Priority;
  estimatedCost: number;
  displayAmount: number;
  threshold: number;
  managementReviewRequired: boolean;
  reviewReasons: string[];
  routingLabel:
    | "Sent Directly to Worker"
    | "Escalated to Property Management";
};

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function workOrderDisplayAmount(
  estimatedCost: unknown,
  actualCost: unknown
) {
  const actual = Number(actualCost);
  if (Number.isFinite(actual) && actual > 0) return actual;
  const estimated = Number(estimatedCost);
  return Number.isFinite(estimated) ? estimated : 0;
}

export function deriveWorkOrderPriority(
  title: string | null | undefined,
  description: string | null | undefined,
  amount: number
): Priority {
  const text = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  if (text.includes("emergency")) return "Emergency";
  if (amount >= 5000) return "High";
  if (amount >= 2500) return "Medium";
  return "Low";
}

export function evaluateWorkOrderRouting(input: {
  title?: string | null;
  description?: string | null;
  woType?: string | null;
  estimatedCost?: unknown;
  actualCost?: unknown;
  approvalThreshold?: unknown;
}): WorkOrderRouting {
  const estimatedCost = Number(input.estimatedCost);
  const safeEstimated = Number.isFinite(estimatedCost) ? estimatedCost : 0;
  const threshold =
    Number(input.approvalThreshold) || DEFAULT_APPROVAL_THRESHOLD;
  const displayAmount = workOrderDisplayAmount(
    input.estimatedCost,
    input.actualCost
  );
  const priority = deriveWorkOrderPriority(
    input.title,
    input.description,
    displayAmount
  );

  const reviewReasons: string[] = [];
  if (priority === "Emergency") {
    reviewReasons.push("Emergency or safety issue");
  }
  if (priority === "High") {
    reviewReasons.push("Major repair");
  }
  if (safeEstimated > threshold) {
    reviewReasons.push("Estimated cost exceeds the approval threshold");
  }
  if (input.woType === "capex") {
    reviewReasons.push("Work is outside the normal maintenance scope");
  }

  const managementReviewRequired =
    priority === "Emergency" ||
    priority === "High" ||
    safeEstimated > threshold ||
    input.woType === "capex";

  return {
    priority,
    estimatedCost: safeEstimated,
    displayAmount,
    threshold,
    managementReviewRequired,
    reviewReasons: managementReviewRequired
      ? Array.from(new Set(reviewReasons))
      : [],
    routingLabel: managementReviewRequired
      ? "Escalated to Property Management"
      : "Sent Directly to Worker",
  };
}

/** Banner / alert rule: High/Emergency priority or estimated cost over threshold. */
export function requiresImmediateManagementAttention(routing: WorkOrderRouting) {
  return (
    routing.priority === "Emergency" ||
    routing.priority === "High" ||
    routing.estimatedCost > routing.threshold
  );
}

/** Cost-based owner approval gate used for real routing. */
export function estimateRequiresOwnerApproval(
  estimatedCost: unknown,
  approvalThreshold: unknown
) {
  const estimate = Number(estimatedCost);
  const threshold =
    Number(approvalThreshold) || DEFAULT_APPROVAL_THRESHOLD;
  const safeEstimate = Number.isFinite(estimate) ? estimate : 0;
  return {
    estimate: safeEstimate,
    threshold,
    requiresOwnerApproval: safeEstimate > threshold,
  };
}

export function formatMoneyPlain(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function routingExplanation(input: {
  estimatedCost: unknown;
  approvalThreshold: unknown;
  status: string;
  requiresOwnerApproval: boolean;
  vendorName?: string | null;
}) {
  const { estimate, threshold, requiresOwnerApproval } =
    estimateRequiresOwnerApproval(
      input.estimatedCost,
      input.approvalThreshold
    );

  if (input.status === "rejected") {
    return "Owner rejected; returned to Property Manager. Not routed to an employee.";
  }

  if (input.status === "pending_owner_approval" || requiresOwnerApproval) {
    if (input.status === "approved") {
      return `Owner approved; returned to Property Manager for assignment (${formatMoneyPlain(estimate)} exceeded ${formatMoneyPlain(threshold)}).`;
    }
    if (input.status === "assigned" || input.status === "in_progress") {
      return `Owner approved and assigned${input.vendorName ? ` to ${input.vendorName}` : ""}.`;
    }
    if (estimate <= 0) {
      return "Awaiting Property Manager estimate before threshold routing.";
    }
    return `Sent to owner approval because ${formatMoneyPlain(estimate)} exceeds the ${formatMoneyPlain(threshold)} approval threshold.`;
  }

  if (input.status === "approved" && !input.vendorName) {
    return "Approved and ready for Property Manager assignment.";
  }

  if (
    ["assigned", "in_progress", "open"].includes(input.status) &&
    !requiresOwnerApproval
  ) {
    if (estimate <= 0) {
      return "With Property Manager for estimate and routing.";
    }
    return `Automatically routed to employee because ${formatMoneyPlain(estimate)} is at or below the ${formatMoneyPlain(threshold)} approval threshold${input.vendorName ? ` (${input.vendorName})` : ""}.`;
  }

  if (estimate <= 0) {
    return "Submitted → Property Manager review (set an estimate to route).";
  }

  return `Property Manager workflow · estimate ${formatMoneyPlain(estimate)} · threshold ${formatMoneyPlain(threshold)}.`;
}

export function workOrderDestination(input: {
  status: string;
  requiresOwnerApproval: boolean;
  vendorId?: string | null;
  completedAt?: string | null;
}): WorkOrderDestination {
  if (input.completedAt || input.status === "canceled") return "completed";
  if (input.status === "pending_owner_approval") return "property_owner";
  if (input.status === "rejected") return "property_manager";
  if (input.status === "approved" && !input.vendorId) return "property_manager";
  if (
    ["assigned", "in_progress"].includes(input.status) ||
    (input.status === "open" && input.vendorId)
  ) {
    return "employee";
  }
  if (input.status === "open" && !input.requiresOwnerApproval && !input.vendorId) {
    return "property_manager";
  }
  return "property_manager";
}

export function destinationLabel(destination: WorkOrderDestination) {
  switch (destination) {
    case "property_owner":
      return "Property Owner";
    case "employee":
      return "Employee";
    case "completed":
      return "Completed";
    default:
      return "Property Manager";
  }
}

export function destinationBadgeClass(destination: WorkOrderDestination) {
  switch (destination) {
    case "property_owner":
      return "bg-amber-100 text-amber-900";
    case "employee":
      return "bg-sky-100 text-sky-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function employeeCanWorkStatus(status: string) {
  return ["open", "assigned", "in_progress"].includes(status);
}
