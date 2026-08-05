export const DEFAULT_APPROVAL_THRESHOLD = 2500;

export type Priority = "Emergency" | "High" | "Medium" | "Low";

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
