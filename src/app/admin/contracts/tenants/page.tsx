import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";

export default async function AdminTenantContractsPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Tenant Contracts
        </h1>
        <p className="text-slate-600">
          Lease contracts and related documents for tenants.
        </p>
      </div>
      <Card title="Tenant contracts">
        <p className="text-sm text-slate-600">
          Tenant contract tools will appear here.
        </p>
      </Card>
    </div>
  );
}
