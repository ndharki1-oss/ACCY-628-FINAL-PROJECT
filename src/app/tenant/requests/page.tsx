import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { createTenantRequest } from "@/app/actions/business";

export default async function TenantRequestsPage() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId, error: tenantError } = await getLinkedTenantId(supabase, user);

  const { data: requests } = tenantId
    ? await supabase
        .from("tenant_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Service requests
      </h1>
      {tenantError ? <p className="text-sm text-rose-700">{tenantError}</p> : null}
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
          <button
            type="submit"
            className="rounded bg-[#0c1f2e] px-4 py-2 text-white"
          >
            Submit
          </button>
        </form>
      </Card>
      <Card title="Your requests">
        {(requests ?? []).length === 0 ? (
          <p className="text-sm text-slate-600">No service requests yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(requests ?? []).map((r) => (
              <li key={r.id} className="flex justify-between border-b border-slate-50 py-2">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.description}</p>
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
