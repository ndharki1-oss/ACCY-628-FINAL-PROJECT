import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { createTenantRequest } from "@/app/actions/business";

const ACTIVE_STATUSES = new Set([
  "open",
  "in_review",
  "in_progress",
  "assigned",
]);

export default async function TenantRequestsPage() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const tenantId =
    tenant?.id ??
    (await supabase.from("tenants").select("id").limit(1).single()).data?.id;

  const { data: requests } = await supabase
    .from("tenant_requests")
    .select("*")
    .eq("tenant_id", tenantId!)
    .order("created_at", { ascending: false });

  const activeRequests = (requests ?? []).filter((r) =>
    ACTIVE_STATUSES.has(r.status)
  );
  const pastRequests = (requests ?? []).filter(
    (r) => !ACTIVE_STATUSES.has(r.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Maintenance Requests
        </h1>
        <p className="text-slate-600">
          Submit new issues and track open or past requests.
        </p>
      </div>

      <Card title="New request">
        <form action={createTenantRequest} className="space-y-3 text-sm">
          <input
            name="title"
            required
            placeholder="Title"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <textarea
            name="description"
            rows={3}
            placeholder="Describe the issue"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <input
            name="preferred_vendor"
            placeholder="Preferred Vendor"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
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
          <ul className="space-y-2 text-sm">
            {activeRequests.map((r) => (
              <li
                key={r.id}
                className="flex justify-between border-b border-slate-50 py-2"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.description}</p>
                  {r.preferred_vendor ? (
                    <p className="text-xs text-slate-500">
                      Preferred vendor: {r.preferred_vendor}
                    </p>
                  ) : null}
                </div>
                <Badge status={r.status} />
              </li>
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
          <ul className="space-y-2 text-sm">
            {pastRequests.map((r) => (
              <li
                key={r.id}
                className="flex justify-between border-b border-slate-50 py-2"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.description}</p>
                  {r.preferred_vendor ? (
                    <p className="text-xs text-slate-500">
                      Preferred vendor: {r.preferred_vendor}
                    </p>
                  ) : null}
                </div>
                <Badge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
