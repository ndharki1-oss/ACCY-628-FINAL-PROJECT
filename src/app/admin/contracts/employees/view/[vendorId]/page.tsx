import { requireRole } from "@/lib/auth";
import { loadEmployeeAgreementTemplateData } from "@/lib/employee-agreements/load";
import { titleForKind } from "@/lib/employee-agreements/types";
import { EmployeeAgreementDownload } from "./download-button";

export default async function AdminEmployeeAgreementViewPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  const { supabase } = await requireRole(["admin"]);
  const data = await loadEmployeeAgreementTemplateData(supabase, vendorId);

  if (!data) {
    return (
      <main className="p-6 text-sm text-rose-700">
        Employee agreement not found.
      </main>
    );
  }

  const pdfSrc = `/admin/contracts/employees/template/${data.vendorId}`;
  const downloadHref = `${pdfSrc}?download=1`;

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
            {data.workerName} — {titleForKind(data.kind)}
          </h1>
          <p className="text-xs text-slate-500">
            {data.companyName}
            {data.specialtyLabel ? ` · ${data.specialtyLabel}` : ""}
          </p>
        </div>
        <EmployeeAgreementDownload href={downloadHref} label="Download PDF" />
      </header>
      <div className="min-h-0 flex-1 p-3">
        <iframe
          title={`${data.workerName} ${titleForKind(data.kind)}`}
          src={pdfSrc}
          className="h-full w-full rounded border border-slate-300 bg-white"
        />
      </div>
    </main>
  );
}
