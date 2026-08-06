import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { InvoiceDocumentDownload } from "./download-button";

export default async function TenantInvoiceViewPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId } = await getLinkedTenantId(supabase, user);

  if (!tenantId) {
    return (
      <main className="p-6 text-sm text-rose-700">
        This login is not linked to a tenant record.
      </main>
    );
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!invoice) {
    return (
      <main className="p-6 text-sm text-rose-700">Invoice not found.</main>
    );
  }

  const pdfSrc = `/tenant/invoices/template/${invoice.id}`;
  const downloadHref = `${pdfSrc}?download=1`;

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
        <h1 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
          {invoice.invoice_number} Invoice
        </h1>
        <InvoiceDocumentDownload
          href={downloadHref}
          label={`Download ${invoice.invoice_number}`}
        />
      </header>
      <div className="min-h-0 flex-1 p-3">
        <iframe
          title={`${invoice.invoice_number} Invoice`}
          src={pdfSrc}
          className="h-full w-full rounded border border-slate-300 bg-white"
        />
      </div>
    </main>
  );
}
