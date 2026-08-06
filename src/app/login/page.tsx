import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[#0c1f2e] px-4 py-10 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #c4784a55, transparent 40%), radial-gradient(circle at 80% 0%, #3d6b8a66, transparent 35%), linear-gradient(160deg, #0c1f2e, #16384f)",
        }}
      />
      <div className="relative mx-auto w-full max-w-4xl">
        <div className="text-center">
          <p className="font-[family-name:var(--font-display)] text-6xl leading-none tracking-tight text-[#f3efe6] sm:text-7xl md:text-8xl">
            Harborline
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.28em] text-[#d4a574] sm:text-sm">
            Commercial Management
          </p>
        </div>

        <LoginForm initialError={params.error} />
      </div>
    </div>
  );
}
