"use client";

export function LeaseDocumentButton({
  leaseId,
  leaseNumber,
}: {
  leaseId: string;
  leaseNumber: string;
}) {
  function openLeasePopup() {
    const url = `/tenant/lease/view/${leaseId}`;
    const width = 920;
    const height = 780;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    window.open(
      url,
      `harborline-lease-${leaseId}`,
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  return (
    <button
      type="button"
      onClick={openLeasePopup}
      className="inline-flex rounded border border-[#0c1f2e] px-3 py-2 text-sm text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-white"
    >
      {leaseNumber} Lease
    </button>
  );
}
