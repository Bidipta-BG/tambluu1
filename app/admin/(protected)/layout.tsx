import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionRole, getTenantIdFromMiddleware } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Tenant } from "@/types";
import AdminShell from "./_components/AdminShell";
import InactiveOverlay from "./_components/InactiveOverlay";

export const dynamic = "force-dynamic";

/**
 * Admin protected layout — server component.
 *
 * Responsibilities:
 *   1. Auth guard (no session / wrong role / tenant mismatch → redirect)
 *   2. Fetch tenant business name for the sidebar wordmark
 *   3. Hand off to AdminShell (client) which renders sidebar + main layout
 *
 * The /admin/login route is outside this layout (in app/admin/login/) so
 * it is never wrapped by this guard.
 */
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionRole();

  // ── Guard 1: no session ──────────────────────────────────────────────────
  if (!session) {
    redirect("/admin/login");
  }

  // ── Guard 2: wrong role ──────────────────────────────────────────────────
  if (session.role !== "admin" && session.role !== "tenant_admin") {
    redirect("/agent/login?error=wrong_role");
  }

  // ── Guard 3: tenant mismatch ─────────────────────────────────────────────
  // Only enforce this if we are not on a local dev host. In local dev, the tenant
  // is driven by a cookie which can easily get out of sync with the admin session.
  const headersList = require('next/headers').headers();
  const hostname = headersList.get('host') ?? 'localhost';
  const isLocal = hostname === "localhost" || hostname.startsWith("localhost:") || hostname.startsWith("127.0.0.1") || hostname.startsWith("192.168.") || hostname.startsWith("10.");

  if (!isLocal) {
    const middlewareTenantId = getTenantIdFromMiddleware();
    if (middlewareTenantId && session.tenantId !== middlewareTenantId) {
      const supabase = createClient();
      await supabase.auth.signOut();
      redirect("/admin/login?error=tenant_mismatch");
    }
  }

  // ── Fetch tenant name for sidebar (graceful fallback) ───────────────────
  let businessName = "Admin Portal";
  try {
    const tenant = await api.get<Tenant>(`/tenants/${session.tenantId}`, {
      next: { revalidate: 300 }, // 5-minute cache
    });
    businessName = tenant.businessName;
  } catch {
    // API unreachable — keep fallback, don't break the layout
  }

  // ── Fetch Subscription Status ─────────────────────────────────────────────
  let subStatus = "active"; // Default to active to prevent false blocking on API failure
  try {
    const supabaseClient = createClient();
    const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
    if (currentSession) {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const res = await fetch(`${API_BASE}/tenants/${session.tenantId}/subscription-status`, {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        subStatus = json.data?.status || "active";
      }
    }
  } catch (e) {
    console.error("Failed to fetch sub status", e);
  }

  return (
    <AdminShell tenantId={session.tenantId} businessName={businessName}>
      {subStatus !== "active" && <InactiveOverlay status={subStatus} />}
      {children}
    </AdminShell>
  );
}
