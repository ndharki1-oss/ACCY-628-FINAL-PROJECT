import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { LeaseDocumentDownload } from "./download-button";

export default async function TenantLeaseViewPage({
  params,
}: {
  params: Promise<{ leaseId: string }>;
}) {
  const { leaseId } = await params;
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId } = await getLinkedTenantId(supabase, user);

  if (!tenantId) {
    return (
      <main className="p-6 text-sm text-rose-700">
        This login is not linked to a tenant record.
      </main>
    );
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("id, lease_number")
    .eq("id", leaseId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!lease) {
    return (
      <main className="p-6 text-sm text-rose-700">Lease not found.</main>
    );
  }

  const pdfSrc = `/tenant/lease/template/${lease.id}`;
  const downloadHref = `${pdfSrc}?download=1`;

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
        <h1 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
          {lease.lease_number} Lease
        </h1>
        <LeaseDocumentDownload
          href={downloadHref}
          label={`Download ${lease.lease_number} Lease`}
        />
      </header>
      <div className="min-h-0 flex-1 p-3">
        <iframe
          title={`${lease.lease_number} Lease`}
          src={pdfSrc}
          className="h-full w-full rounded border border-slate-300 bg-white"
        />
      </div>
    </main>
  );
}
