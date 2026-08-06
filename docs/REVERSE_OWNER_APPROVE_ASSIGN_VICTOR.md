# Reverse: owner approve → assign Victor (over-threshold contractor)

App-only change on `Jack-Harveys-Branch`. No seed or schema migrations.

## Behavior to undo
- Owner approve on `pending_owner_approval` sets status `assigned` and
  `vendor_id` = Victor Chen (`50000000-0000-0000-0000-000000000001`).
- Admin assign forces that same contractor when estimate / flag is over threshold.
- Copy updates on admin work-orders + routing explanations.

## Reverse (app)
Restore these files from before the feature commit (or from `main` if not merged):

- `src/app/actions/business.ts`
  - `ownerApproveWorkOrder`: approve → `status: "approved"`, `vendor_id: null`
  - `adminAssignWorkOrder`: assign submitted `vendor_id` without over-threshold force
- `src/lib/work-order-routing.ts` — prior `routingExplanation` strings
- `src/app/admin/work-orders/page.tsx` — prior intro copy
- `src/app/employee/work-orders/page.tsx` — prior intro copy

Then delete this file.

## Data
No seed rows changed. Existing WOs already `approved` without a vendor stay until
admin assigns; new approvals follow the new path until reversed.
