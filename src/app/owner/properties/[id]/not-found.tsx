import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <div className="space-y-3">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Property not found
      </h1>
      <p className="text-sm text-slate-600">
        This property is not in your portfolio, or it no longer exists.
      </p>
      <Link href="/owner/properties" className="text-sm text-[#c4784a]">
        ← Back to properties
      </Link>
    </div>
  );
}
