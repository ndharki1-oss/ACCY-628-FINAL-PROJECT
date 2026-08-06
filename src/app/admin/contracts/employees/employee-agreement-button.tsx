"use client";

export function EmployeeAgreementDocumentButton({
  vendorId,
  label = "View contract",
}: {
  vendorId: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.open(
          `/admin/contracts/employees/view/${vendorId}`,
          "_blank",
          "noopener,noreferrer,width=960,height=800"
        );
      }}
      className="rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
    >
      {label}
    </button>
  );
}
