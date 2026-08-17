"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin login form — client component.
 * Accepts email (or phone) + password, signs in via Supabase,
 * then redirects to /admin on success.
 */
export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const isPhone = /^\+?[\d\s\-().]{7,}$/.test(identifier.trim());

    const { error: signInError } = isPhone
      ? await supabase.auth.signInWithPassword({
          phone: identifier.trim(),
          password,
        })
      : await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password,
        });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30">
            <svg
              className="h-6 w-6 text-violet-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-50">
            Admin Portal
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to your admin account
          </p>
        </div>

        {/* URL-driven error banners */}
        {urlError === "tenant_mismatch" && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <span className="font-medium">Session conflict.</span> You were
            signed in to a different tenant. Please sign in again.
          </div>
        )}
        {urlError === "wrong_role" && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400"
          >
            Your account doesn&apos;t have admin access. Please use the{" "}
            <a href="/agent/login" className="underline underline-offset-2">
              agent login
            </a>{" "}
            instead.
          </div>
        )}

        {/* Form card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/30">
          <form
            id="admin-login-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-identifier"
                className="text-xs font-medium text-slate-400"
              >
                Email or phone
              </label>
              <input
                id="admin-identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-password"
                className="text-xs font-medium text-slate-400"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/30"
              >
                {error}
              </p>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
