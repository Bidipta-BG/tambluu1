import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TenantCacheEntry {
  id: string;
  expiresAt: number;
}

interface TenantApiResponse {
  id: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// In-memory tenant cache (per edge/node worker instance, 60-second TTL)
// ---------------------------------------------------------------------------
const tenantCache = new Map<string, TenantCacheEntry | null>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached(hostname: string): TenantCacheEntry | null | undefined {
  const entry = tenantCache.get(hostname);
  if (entry === undefined) return undefined; // not in cache
  if (entry === null) return null; // cached "not found"
  if (Date.now() > entry.expiresAt) {
    tenantCache.delete(hostname);
    return undefined; // expired
  }
  return entry;
}

function setCached(hostname: string, id: string | null): void {
  if (id === null) {
    tenantCache.set(hostname, null);
  } else {
    tenantCache.set(hostname, { id, expiresAt: Date.now() + CACHE_TTL_MS });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true for localhost variants and *.vercel.app preview URLs */
function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.startsWith("localhost:") ||
    hostname.endsWith(".vercel.app") ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("127.0.0.1:") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.")
  );
}

/**
 * Resolve tenant id for production hostnames via the backend API.
 * Returns null if the tenant is not found or the request fails.
 */
async function resolveTenantFromApi(hostname: string): Promise<string | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) {
    console.warn("[middleware] NEXT_PUBLIC_API_BASE_URL is not set");
    return null;
  }

  // Strip port from hostname for the lookup
  const bareHostname = hostname.split(":")[0];

  try {
    const res = await fetch(
      `${apiBase}/tenants/by-domain/${encodeURIComponent(bareHostname)}`,
      {
        // No Next.js data-cache here (middleware runs in edge runtime or Node);
        // rely on our own in-memory TTL cache instead.
        cache: "no-store",
      }
    );

    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(
        `[middleware] Tenant lookup failed: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const json = await res.json();
    return json.data?.id ?? null;
  } catch (err) {
    console.error("[middleware] Tenant lookup error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// "Domain not configured" response
// ---------------------------------------------------------------------------
function notConfiguredResponse(): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Domain not configured</title>
    <style>
      body { font-family: system-ui, sans-serif; display: flex; align-items: center;
             justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
      .card { text-align: center; padding: 2rem; }
      h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #f8fafc; }
      p  { color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Domain not configured</h1>
      <p>This domain hasn't been set up for any tenant yet.</p>
    </div>
  </body>
</html>`,
    {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const hostname = request.headers.get("host") ?? "localhost";

  // ------------------------------------------------------------------
  // LOCAL DEV / PREVIEW OVERRIDE
  // Read tenant id from ?tenant=<uuid> query param OR x-tenant-id cookie
  // ------------------------------------------------------------------
  if (isLocalDevHost(hostname)) {
    const paramTenantId =
      request.nextUrl.searchParams.get("tenant") ?? undefined;
    const cookieTenantId =
      request.cookies.get("x-tenant-id")?.value ?? undefined;
    const tenantId = paramTenantId ?? cookieTenantId;

    if (!tenantId) {
      // Friendly developer warning — still renders the app
      const response = NextResponse.next();
      response.headers.set("x-tenant-id", "");
      response.headers.set("x-tenant-missing", "true");
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("x-tenant-id", tenantId);

    // Persist to cookie so the tenant survives page navigations without
    // having to keep the query param in the URL.
    if (paramTenantId && !cookieTenantId) {
      response.cookies.set("x-tenant-id", paramTenantId, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return response;
  }

  // ------------------------------------------------------------------
  // PRODUCTION — resolve tenant from hostname
  // ------------------------------------------------------------------
  const cached = getCached(hostname);

  // Cache hit
  if (cached !== undefined) {
    if (cached === null) return notConfiguredResponse();
    const response = NextResponse.next();
    response.headers.set("x-tenant-id", cached.id);
    return response;
  }

  // Cache miss — call the backend
  const tenantId = await resolveTenantFromApi(hostname);
  setCached(hostname, tenantId);

  if (!tenantId) return notConfiguredResponse();

  const response = NextResponse.next();
  response.headers.set("x-tenant-id", tenantId);
  return response;
}

// ---------------------------------------------------------------------------
// Matcher — run on all routes except Next.js internals
// ---------------------------------------------------------------------------
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
