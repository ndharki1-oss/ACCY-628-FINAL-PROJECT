"use client";

export function ContractDocumentDownload({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-[#0c1f2e] hover:bg-slate-50"
    >
      {label}
    </a>
  );
}
