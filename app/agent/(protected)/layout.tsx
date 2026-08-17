import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionRole, getTenantIdFromMiddleware } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

/**
 * Agent protected layout — server component with full auth guard.
 * Wraps only /agent (dashboard) routes. The /agent/login page
 * sits outside this layout, so it is NOT guarded.
 *
 * Guards:
 * 1. No session              → redirect to /agent/login
 * 2. Wrong role (not agent)  → redirect to /admin/login?error=wrong_role
 * 3. Tenant mismatch         → sign out + redirect to /agent/login?error=tenant_mismatch
 */
export default async function AgentProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionRole();

  // ── Guard 1: no session ──────────────────────────────────────────────────
  if (!session) {
    redirect("/agent/login");
  }

  // ── Guard 2: wrong role ──────────────────────────────────────────────────
  if (session.role !== "agent") {
    redirect("/admin/login?error=wrong_role");
  }

  // ── Guard 3: tenant mismatch ─────────────────────────────────────────────
  const middlewareTenantId = getTenantIdFromMiddleware();

  if (middlewareTenantId && session.tenantId !== middlewareTenantId) {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/agent/login?error=tenant_mismatch");
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/30">
            <svg
              className="h-4 w-4 text-cyan-400"
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
          <span className="text-sm font-medium text-slate-200">
            Agent Portal
          </span>
          <span className="hidden rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-500 ring-1 ring-slate-700 sm:inline-block">
            tenant: {session.tenantId}
          </span>
        </div>
        <LogoutButton redirectTo="/agent/login" />
      </header>
      <main>{children}</main>
    </div>
  );
}
