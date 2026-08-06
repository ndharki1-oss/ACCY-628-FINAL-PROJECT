import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { createTenantRequest } from "@/app/tenant/actions";
import { OpenRequestStatusMenu } from "@/app/tenant/open-request-status-menu";
import { RequestSubmittedBanner } from "@/app/tenant/request-submitted-banner";
import { statusClass } from "@/lib/utils";

const ACTIVE_STATUSES = new Set([
  "open",
  "in_review",
  "in_progress",
  "assigned",
]);

const SERVICE_TYPES = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Pest Control",
  "General Maintenance",
] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function RequestStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-medium capitalize ${statusClass(status)}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function RequestListItem({
  request,
  cancellable = false,
}: {
  request: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    service_type?: string | null;
    request_date?: string | null;
    recurring_issue?: boolean | null;
    work_orders?:
      | { wo_number: string; status: string }
      | { wo_number: string; status: string }[]
      | null;
  };
  cancellable?: boolean;
}) {
  const meta = [
    request.service_type,
    request.request_date,
    request.recurring_issue ? "Recurring" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const workOrder = Array.isArray(request.work_orders)
    ? request.work_orders[0]
    : request.work_orders;

  return (
    <li className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium text-[#0c1f2e]">{request.title}</p>
        {meta ? <p className="mt-0.5 text-xs text-slate-500">{meta}</p> : null}
        {request.description ? (
          <p className="mt-1 text-sm text-slate-600">{request.description}</p>
        ) : null}
        {workOrder ? (
          <p className="mt-1 text-xs font-medium text-[#c4784a]">
            Work order {workOrder.wo_number} ·{" "}
            {workOrder.status.replaceAll("_", " ")}
          </p>
        ) : null}
      </div>
      {cancellable ? (
        <OpenRequestStatusMenu requestId={request.id} status={request.status} />
      ) : (
        <RequestStatus status={request.status} />
      )}
    </li>
  );
}

export default async function TenantRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; via?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId, tenant: tenantRow, error: tenantError } = await getLinkedTenantId(
    supabase,
    user
  );

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Maintenance Requests
          </h1>
          <p className="text-sm text-rose-700">
            {tenantError ?? "This login is not linked to a tenant record."}
          </p>
        </div>
      </div>
    );
  }

  const { data: requests } = await supabase
    .from("tenant_requests")
    .select("*, work_orders!tenant_request_id(wo_number, status)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const activeRequests = (requests ?? []).filter((r) =>
    ACTIVE_STATUSES.has(r.status)
  );
  const pastRequests = (requests ?? []).filter(
    (r) => !ACTIVE_STATUSES.has(r.status)
  );

  const via = (params.via ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const sentViaLabels = via.map((channel) =>
    channel === "sms" ? "text message" : channel === "email" ? "email" : "copy"
  );

  return (
    <div className="space-y-6">
      <PageHeading title="Maintenance Requests" />

      {params.submitted === "1" ? (
        <RequestSubmittedBanner
          viaLabels={sentViaLabels}
          email={tenantRow?.email}
          phone={tenantRow?.phone}
          via={via}
        />
      ) : null}

      <Card title="New Request">
        <form action={createTenantRequest} className="space-y-4 text-sm">
          <label className="block space-y-1">
            <span className="font-medium text-[#0c1f2e]">Title</span>
            <input
              name="title"
              required
              placeholder="Brief summary of the issue"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-medium text-[#0c1f2e]">Date</span>
            <input
              type="date"
              name="request_date"
              required
              defaultValue={todayIsoDate()}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-medium text-[#0c1f2e]">Type of Service</span>
            <select
              name="service_type"
              required
              defaultValue=""
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
            >
              <option value="" disabled>
                Select a service type
              </option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="font-medium text-[#0c1f2e]">
              Recurring Issue?
            </legend>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="recurring_issue"
                  value="yes"
                  className="accent-[#0c1f2e]"
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="recurring_issue"
                  value="no"
                  defaultChecked
                  className="accent-[#0c1f2e]"
                />
                No
              </label>
            </div>
          </fieldset>

          <label className="block space-y-1">
            <span className="font-medium text-[#0c1f2e]">
              Description of the Issue
            </span>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Describe what is happening, where it is located, and any other useful details"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="flex items-start gap-2 rounded border border-slate-200 p-3">
            <input
              type="checkbox"
              name="send_copy"
              className="mt-1 accent-[#0c1f2e]"
            />
            <span>
              <span className="font-medium text-[#0c1f2e]">
                Send me a copy of this request
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Uses the contact information on your tenant account.
              </span>
            </span>
          </label>

          <button
            type="submit"
            className="rounded bg-[#0c1f2e] px-4 py-2 text-white"
          >
            Submit
          </button>
        </form>
      </Card>

      <Card title="Open requests">
        {activeRequests.length === 0 ? (
          <p className="text-sm text-slate-600">No open maintenance requests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activeRequests.map((r) => (
              <RequestListItem key={r.id} request={r} cancellable />
            ))}
          </ul>
        )}
      </Card>

      <Card title="Past requests">
        {pastRequests.length === 0 ? (
          <p className="text-sm text-slate-600">
            Completed and closed requests will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pastRequests.map((r) => (
              <RequestListItem key={r.id} request={r} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
