import Link from "next/link";

export function PropertyLink({
  id,
  children,
  className = "font-medium text-[#0c1f2e] hover:text-[#c4784a] hover:underline",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={`/owner/properties/${id}`} className={className}>
      {children}
    </Link>
  );
}
