import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { loadLeaseTemplateData } from "@/lib/lease-templates/load";
import { OwnerContractDownload } from "@/app/owner/contracts/download-button";

export default async function OwnerTenantLeaseViewPage({
  params,
}: {
  params: Promise<{ leaseId: string }>;
}) {
  const { leaseId } = await params;
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId } = await getLinkedOwnerId(supabase, user);

  if (!ownerId) {
    return (
      <main className="p-6 text-sm text-rose-700">
        This login is not linked to an owner record.
      </main>
    );
  }

  const data = await loadLeaseTemplateData(supabase, leaseId, { ownerId });

  if (!data) {
    return (
      <main className="p-6 text-sm text-rose-700">Lease not found.</main>
    );
  }

  const pdfSrc = `/owner/contracts/leases/template/${data.leaseId}`;
  const downloadHref = `${pdfSrc}?download=1`;

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
            {data.leaseNumber} Lease
          </h1>
          <p className="text-xs text-slate-500">
            {data.tenantCompany}
            {data.tenantContact ? ` · ${data.tenantContact}` : ""}
            {` · ${data.propertyName}`}
          </p>
        </div>
        <OwnerContractDownload href={downloadHref} label="Download PDF" />
      </header>
      <div className="min-h-0 flex-1 p-3">
        <iframe
          title={`${data.leaseNumber} Lease`}
          src={pdfSrc}
          className="h-full w-full rounded border border-slate-300 bg-white"
        />
      </div>
    </main>
  );
}
