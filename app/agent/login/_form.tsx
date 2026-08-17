"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Agent login form — client component.
 * Accepts email (or phone) + password, signs in via Supabase,
 * then redirects to /agent on success.
 */
export default function AgentLoginForm({ tenantId }: { tenantId: string }) {
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
    // Strip +91 just like we do during agent creation
    const rawIdentifier = identifier.trim().replace(/^\+91\s*/, '');
    
    // Must match the tenant-scoped convention used when the agent was created
    const fakeEmail = `${tenantId}_${rawIdentifier}@agent.tambola.com`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/agent");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/30">
            <svg
              className="h-6 w-6 text-cyan-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-50">
            Agent Portal
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to your agent account
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
            Your account doesn&apos;t have agent access. Please use the{" "}
            <a href="/admin/login" className="underline underline-offset-2">
              admin login
            </a>{" "}
            instead.
          </div>
        )}

        {/* Form card */}
        {!tenantId && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <span className="font-bold uppercase tracking-wider">Developer Warning:</span>
            <br />
            No tenant ID detected. In local development, you must append <code>?tenant=YOUR_TENANT_ID</code> to the URL to test agent login.
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/30">
          <form
            id="agent-login-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="agent-identifier"
                className="text-xs font-medium text-slate-400"
              >
                Username or Phone
              </label>
              <input
                id="agent-identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 123"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="agent-password"
                className="text-xs font-medium text-slate-400"
              >
                Password
              </label>
              <input
                id="agent-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
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
              id="agent-login-submit"
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-cyan-500 disabled:pointer-events-none disabled:opacity-60"
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
