import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppRole = "tenant_admin" | "admin" | "agent";

export interface SessionInfo {
  userId: string;
  role: AppRole;
  /** Tenant ID stored in Supabase app_metadata.tenant_id */
  tenantId: string;
}

// ---------------------------------------------------------------------------
// getSessionRole
//
// Server-side helper. Reads the current Supabase session and extracts
// { role, tenantId } from the JWT's app_metadata claim.
//
// Returns null when:
//   - There is no active session / the session is expired.
//   - app_metadata.role is missing or is not a known AppRole.
//   - app_metadata.tenant_id is missing.
// ---------------------------------------------------------------------------
export async function getSessionRole(): Promise<SessionInfo | null> {
  const supabase = createClient();

  // getUser() makes a network round-trip to Supabase Auth to verify the JWT
  // and return a fresh user object — safer than getSession() which only reads
  // the local cookie without re-validating.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const role = meta["role"] as AppRole | undefined;
  const tenantId = meta["tenant_id"] as string | undefined;

  // Accept 'tenant_admin' or 'admin' or 'agent'
  if (!role || !["tenant_admin", "admin", "agent"].includes(role)) return null;
  if (!tenantId) return null;

  return { userId: user.id, role, tenantId };
}

// ---------------------------------------------------------------------------
// getTenantIdFromMiddleware
//
// Reads the x-tenant-id header attached by middleware.ts.
// Returns an empty string when running locally without a ?tenant= param.
// ---------------------------------------------------------------------------
export function getTenantIdFromMiddleware(): string {
  return headers().get("x-tenant-id") ?? "";
}
