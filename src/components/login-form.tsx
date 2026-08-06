"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEMO_OWNER_LOGIN_EMAIL,
  DEMO_TENANT_LOGIN_EMAIL,
} from "@/lib/demo-login-identities";

const DEMO_PASSWORD = "demo12";

type RoleKey = "owner" | "tenant" | "employee";

type EmployeeJob = {
  id: string;
  label: string;
  email: string;
};

const EMPLOYEE_JOBS: EmployeeJob[] = [
  { id: "admin", label: "Property Manager", email: "admin@example.com" },
  { id: "employee", label: "Employee", email: "employee@example.com" },
  { id: "accounting", label: "Accounting", email: "accounting@example.com" },
];

const ROLE_TILES: { key: RoleKey; title: string }[] = [
  { key: "owner", title: "Owner" },
  { key: "tenant", title: "Tenant" },
  { key: "employee", title: "Employee" },
];

const ROLE_EMAIL: Record<"owner" | "tenant", string> = {
  owner: DEMO_OWNER_LOGIN_EMAIL,
  tenant: DEMO_TENANT_LOGIN_EMAIL,
};

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey | null>(null);
  const [employeeStep, setEmployeeStep] = useState<"job" | "credentials">(
    "job",
  );
  const [jobId, setJobId] = useState(EMPLOYEE_JOBS[0].id);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  const selectedJob = useMemo(
    () => EMPLOYEE_JOBS.find((job) => job.id === jobId) ?? null,
    [jobId],
  );

  function openRole(next: RoleKey) {
    setRole(next);
    setEmployeeStep("job");
    setJobId(EMPLOYEE_JOBS[0].id);
    setPassword(DEMO_PASSWORD);
    setError("");
    setLoading(false);

    if (next === "owner" || next === "tenant") {
      setEmail(ROLE_EMAIL[next]);
    } else {
      setEmail("");
    }
  }

  function goBack() {
    if (role === "employee" && employeeStep === "credentials") {
      setEmployeeStep("job");
      setError("");
      setLoading(false);
      return;
    }

    setRole(null);
    setEmployeeStep("job");
    setJobId(EMPLOYEE_JOBS[0].id);
    setEmail("");
    setPassword(DEMO_PASSWORD);
    setError("");
    setLoading(false);
  }

  function continueEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob) return;
    setEmail(selectedJob.email);
    setPassword(DEMO_PASSWORD);
    setEmployeeStep("credentials");
    setError("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role || loading || !email) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(
        message.includes("fetch")
          ? "Could not reach Supabase (network/TLS). Restart the app with: npm run dev"
          : message,
      );
      setLoading(false);
    }
  }

  if (!role) {
    return (
      <div className="mt-10">
        {error ? (
          <p className="mb-4 rounded bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          {ROLE_TILES.map((tile) => (
            <button
              key={tile.key}
              type="button"
              onClick={() => openRole(tile.key)}
              className="flex min-h-[8.5rem] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-12 text-center font-[family-name:var(--font-display)] text-3xl text-[#f3efe6] backdrop-blur transition hover:border-[#d4a574]/60 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a574] sm:min-h-[11rem] sm:text-4xl"
            >
              {tile.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = ROLE_TILES.find((tile) => tile.key === role)?.title;

  if (role === "employee" && employeeStep === "job") {
    return (
      <form
        onSubmit={continueEmployee}
        className="mx-auto mt-10 max-w-md space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-[family-name:var(--font-display)] text-xl text-[#f3efe6]">
            {title}
          </p>
          <button
            type="button"
            onClick={goBack}
            className="text-sm text-[#d4a574] hover:text-[#f3efe6]"
          >
            Back
          </button>
        </div>

        <label className="block text-sm text-slate-200">
          Job
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            required
            className="mt-1 w-full rounded border border-white/20 bg-[#0c1f2e] px-3 py-2 text-white outline-none focus:border-[#d4a574]"
          >
            {EMPLOYEE_JOBS.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="w-full rounded bg-[#c4784a] px-4 py-2.5 font-medium text-white hover:bg-[#b5683c]"
        >
          Next
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-10 max-w-md space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-[family-name:var(--font-display)] text-xl text-[#f3efe6]">
          {title}
          {role === "employee" && selectedJob ? (
            <span className="ml-2 text-base text-slate-300">
              · {selectedJob.label}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={goBack}
          className="text-sm text-[#d4a574] hover:text-[#f3efe6]"
        >
          Back
        </button>
      </div>

      {error ? (
        <p className="rounded bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <label className="block text-sm text-slate-200">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-white/20 bg-[#0c1f2e] px-3 py-2 text-white outline-none focus:border-[#d4a574]"
        />
      </label>

      <label className="block text-sm text-slate-200">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-white/20 bg-[#0c1f2e] px-3 py-2 text-white outline-none focus:border-[#d4a574]"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-[#c4784a] px-4 py-2.5 font-medium text-white hover:bg-[#b5683c] disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
