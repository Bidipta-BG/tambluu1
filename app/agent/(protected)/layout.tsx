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
    <div 
      className="min-h-screen font-sans bg-cover bg-center bg-fixed"
      style={{ backgroundImage: 'linear-gradient(to bottom right, #8a1c4a, #4a2133, #8a4832)' }}
    >
      <main className="mx-auto w-full max-w-7xl pb-16 pt-4">
        {children}
      </main>
    </div>
  );
}
