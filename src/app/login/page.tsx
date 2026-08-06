import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[#0c1f2e] px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #c4784a55, transparent 40%), radial-gradient(circle at 80% 0%, #3d6b8a66, transparent 35%), linear-gradient(160deg, #0c1f2e, #16384f)",
        }}
      />
      <div className="relative mx-auto w-full max-w-md">
        <p className="font-[family-name:var(--font-display)] text-4xl text-[#f3efe6]">
          Harborline
        </p>
        <p className="mt-1 text-sm uppercase tracking-[0.25em] text-[#d4a574]">
          Commercial Management
        </p>
        <p className="mt-4 text-slate-300">
          Sign in to your role-based workspace for properties, leases, work, and
          cash collections.
        </p>

        <LoginForm initialError={params.error} />

        <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
          <p className="mb-2 font-medium text-[#d4a574]">Demo accounts</p>
          <ul className="space-y-1 font-mono">
            <li>admin@example.com</li>
            <li>owner@example.com</li>
            <li>tenant@example.com</li>
            <li>employee@example.com</li>
            <li>accounting@example.com</li>
          </ul>
          <p className="mt-2">Password for all: demo12</p>
        </div>
      </div>
    </div>
  );
}
