"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

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
          : message
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
    >
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
          className="mt-1 w-full rounded border border-white/20 bg-[#0c1f2e] px-3 py-2 text-white outline-none focus:border-[#d4a574]"
          placeholder="admin@example.com"
        />
      </label>
      <label className="block text-sm text-slate-200">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue="demo12"
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
