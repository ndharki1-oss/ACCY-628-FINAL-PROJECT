/** Owner-visible work orders: over the property approval threshold. */

import { workOrderDisplayAmount } from "@/lib/work-order-routing";

export const DEFAULT_OWNER_APPROVAL_THRESHOLD = 2500;

/**
 * Owners only see WOs already routed for approval that are above the
 * property management-agreement approval threshold. Unestimated /
 * below-threshold work stays on the admin queue.
 */
export function isOwnerVisibleWorkOrder(input: {
  vendorId?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  approvalThreshold?: number | null;
}) {
  const threshold =
    Number(input.approvalThreshold) > 0
      ? Number(input.approvalThreshold)
      : DEFAULT_OWNER_APPROVAL_THRESHOLD;
  return (
    workOrderDisplayAmount(input.estimatedCost, input.actualCost) > threshold
  );
}
