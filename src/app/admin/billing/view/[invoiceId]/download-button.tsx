"use client";

export function InvoiceDocumentDownload({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex rounded bg-[#0c1f2e] px-3 py-2 text-sm text-white hover:bg-[#163247]"
    >
      {label}
    </a>
  );
}
