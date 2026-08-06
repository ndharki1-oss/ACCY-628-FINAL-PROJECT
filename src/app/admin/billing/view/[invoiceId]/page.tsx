import { requireRole } from "@/lib/auth";
import { InvoiceDocumentDownload } from "./download-button";

export default async function AdminInvoiceViewPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const { supabase } = await requireRole(["admin"]);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("id", invoiceId)
    .eq("party_type", "tenant")
    .maybeSingle();

  if (!invoice) {
    return (
      <main className="p-6 text-sm text-rose-700">Invoice not found.</main>
    );
  }

  const pdfSrc = `/admin/billing/template/${invoice.id}`;
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
