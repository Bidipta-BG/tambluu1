/**
 * Typed backend API client.
 *
 * Usage:
 *   import { api } from "@/lib/api";
 *   const tenant = await api.get<Tenant>("/tenants/by-domain/example.com");
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------
async function request<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    /** Pass Next.js fetch cache options (server-side only) */
    next?: NextFetchRequestConfig;
    cache?: RequestCache;
  } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
    next: options.next,
    cache: options.cache,
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const json = await res.json();
  return (json && "data" in json ? json.data : json) as T;
}

// ---------------------------------------------------------------------------
// Public API surface
// ---------------------------------------------------------------------------
export const api = {
  get<T>(
    path: string,
    opts?: { headers?: Record<string, string>; next?: NextFetchRequestConfig; cache?: RequestCache },
  ): Promise<T> {
    return request<T>("GET", path, opts);
  },

  post<T>(
    path: string,
    body: unknown,
    opts?: { headers?: Record<string, string> },
  ): Promise<T> {
    return request<T>("POST", path, { ...opts, body });
  },

  patch<T>(
    path: string,
    body: unknown,
    opts?: { headers?: Record<string, string> },
  ): Promise<T> {
    return request<T>("PATCH", path, { ...opts, body });
  },

  put<T>(
    path: string,
    body: unknown,
    opts?: { headers?: Record<string, string> },
  ): Promise<T> {
    return request<T>("PUT", path, { ...opts, body });
  },

  del<T>(
    path: string,
    opts?: { headers?: Record<string, string> },
  ): Promise<T> {
    return request<T>("DELETE", path, opts);
  },
};
