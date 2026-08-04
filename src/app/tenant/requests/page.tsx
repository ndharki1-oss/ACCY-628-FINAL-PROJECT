import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { createTenantRequest } from "@/app/actions/business";

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

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Service requests
      </h1>
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
      </Card>
    </div>
  );
}
