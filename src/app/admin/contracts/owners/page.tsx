import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";

export default async function AdminOwnerContractsPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Owner Contracts
        </h1>
        <p className="text-slate-600">
          Management agreements and contract documents for property owners.
        </p>
      </div>
      <Card title="Owner contracts">
        <p className="text-sm text-slate-600">
          Owner contract tools will appear here.
        </p>
      </Card>
    </div>
  );
}
