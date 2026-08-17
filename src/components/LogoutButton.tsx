"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  /** Where to redirect after sign-out. Defaults to "/admin/login". */
  redirectTo?: string;
  className?: string;
}

/**
 * LogoutButton — calls supabase.auth.signOut() then redirects.
 *
 * Usage in admin:
 *   <LogoutButton redirectTo="/admin/login" />
 *
 * Usage in agent:
 *   <LogoutButton redirectTo="/agent/login" />
 */
export default function LogoutButton({
  redirectTo = "/admin/login",
  className,
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(redirectTo);
    router.refresh(); // clear RSC cache so layouts re-evaluate auth
  }

  return (
    <button
      id="logout-btn"
      onClick={handleLogout}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:pointer-events-none disabled:opacity-50"
      }
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
          Signing out…
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
          Sign out
        </>
      )}
    </button>
  );
}
