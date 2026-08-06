"use client";

export function InvoiceDocumentButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  function openInvoicePopup() {
    const url = `/tenant/invoices/view/${invoiceId}`;
    const width = 920;
    const height = 780;
    const left = Math.max(
      0,
      Math.round(window.screenX + (window.outerWidth - width) / 2)
    );
    const top = Math.max(
      0,
      Math.round(window.screenY + (window.outerHeight - height) / 2)
    );
    window.open(
      url,
      `harborline-invoice-${invoiceId}`,
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  return (
    <button
      type="button"
      onClick={openInvoicePopup}
      className="w-full rounded border border-[#0c1f2e] px-3 py-2 text-left text-sm font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-white"
    >
      View {invoiceNumber}
    </button>
  );
}
