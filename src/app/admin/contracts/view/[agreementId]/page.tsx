import { requireRole } from "@/lib/auth";
import { loadManagementAgreementTemplateData } from "@/lib/management-agreements/load";
import { ContractDocumentDownload } from "./download-button";

export default async function AdminContractViewPage({
  params,
}: {
  params: Promise<{ agreementId: string }>;
}) {
  const { agreementId } = await params;
  const { supabase } = await requireRole(["admin"]);
  const data = await loadManagementAgreementTemplateData(
    supabase,
    agreementId
  );

  if (!data) {
    return (
      <main className="p-6 text-sm text-rose-700">
        Management agreement not found.
      </main>
    );
  }

  const pdfSrc = `/admin/contracts/template/${data.agreementId}`;
  const downloadHref = `${pdfSrc}?download=1`;

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
            {data.propertyName} Management Agreement
          </h1>
          <p className="text-xs text-slate-500">
            {data.ownerCompany}
            {data.ownerContact ? ` · ${data.ownerContact}` : ""}
          </p>
        </div>
        <ContractDocumentDownload
          href={downloadHref}
          label="Download PDF"
        />
      </header>
      <div className="min-h-0 flex-1 p-3">
        <iframe
          title={`${data.propertyName} Management Agreement`}
          src={pdfSrc}
          className="h-full w-full rounded border border-slate-300 bg-white"
        />
      </div>
    </main>
  );
}
