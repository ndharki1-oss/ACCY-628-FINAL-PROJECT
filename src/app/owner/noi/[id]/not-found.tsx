import Link from "next/link";

export default function OwnerNoiPropertyNotFound() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Property not found
      </h1>
      <p className="text-sm text-slate-600">
        That property is not linked to this owner account, or it does not exist.
      </p>
      <Link href="/owner/noi" className="text-sm text-[#c4784a] hover:underline">
        ← Back to Property NOI
      </Link>
    </div>
  );
}
