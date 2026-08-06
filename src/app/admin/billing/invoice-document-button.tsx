"use client";

export function AdminInvoiceDocumentButton({
  invoiceId,
  invoiceNumber,
  className,
}: {
  invoiceId: string;
  invoiceNumber: string;
  className?: string;
}) {
  function openInvoicePopup() {
    const url = `/admin/billing/view/${invoiceId}`;
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
      `harborline-admin-invoice-${invoiceId}`,
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  return (
    <button
      type="button"
      onClick={openInvoicePopup}
      className={
        className ??
        "rounded border border-[#0c1f2e] px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-white"
      }
    >
      View PDF
      <span className="sr-only"> for {invoiceNumber}</span>
    </button>
  );
}
