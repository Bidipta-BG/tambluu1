"use client";
import { Spinner } from "@/components/Spinner";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Admin login form — client component.
 * Password-only. The backend resolves the tenant from the Origin header
 * (automatically set to the page's domain by the browser), so only the
 * correct password for THIS domain's admin will be accepted.
 */
export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // POST to our backend — Origin header is set automatically by the browser.
      // The backend resolves the tenant from Origin → looks up owner_email →
      // signs in with Supabase → returns session tokens.
      //
      // In local dev (localhost), the backend cannot resolve a tenant from
      // the "localhost" domain, so we also pass the tenantId from the URL
      // query param (?tenant=<uuid>) that middleware already uses for local dev.
      const tenantId = searchParams.get("tenant") ?? undefined;

      const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, ...(tenantId ? { tenantId } : {}) }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Map HTTP status codes to user-friendly messages
        if (res.status === 401) {
          setError("Incorrect password. Please try again.");
        } else if (res.status === 429) {
          setError(
            "Too many failed attempts. Please wait 15 minutes before trying again."
          );
        } else if (res.status === 404) {
          setError("This domain is not configured as a game admin portal.");
        } else {
          setError(
            json?.error?.message ??
              json?.message ??
              "Something went wrong. Please try again."
          );
        }
        setLoading(false);
        return;
      }

      const { access_token, refresh_token } = json.data;

      // Hydrate the Supabase session in the browser using the tokens returned
      // by the backend. This writes the session to the Supabase auth cookie so
      // the server-side protected layout can read it on the next request.
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        setError("Failed to establish session. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div 
      className="relative min-h-screen font-sans bg-cover bg-center overflow-hidden" 
      style={{ backgroundImage: 'linear-gradient(to bottom right, #8a1c4a, #4a2133, #8a4832)' }}
    >
      {/* --- MOCK DASHBOARD BACKGROUND --- */}
      <div className="absolute inset-0 pointer-events-none opacity-80 blur-[2px] p-2 sm:p-4 pb-20">
        <div className="w-full max-w-xl mx-auto space-y-10 sm:space-y-12">
          
          <div className="w-full flex flex-col items-center mx-auto space-y-4">
            <div className="w-full bg-[#0a0088] py-4 flex justify-center items-center shadow-lg border-2 border-transparent border-t-[#4a4a8a] border-b-[#050040]">
              <h1 className="text-white font-black text-xl sm:text-2xl tracking-widest uppercase">
                ADMIN DASHBOARD
              </h1>
            </div>
            <div className="w-full py-2 flex justify-center items-center">
              <span className="text-white font-bold text-lg sm:text-xl tracking-wide">
                regular admin link
              </span>
            </div>
          </div>
          
          <div className="w-full bg-[#0a0088] flex flex-col p-4 shadow-lg mx-auto border-t-2 border-slate-700">
            <h2 className="text-white font-black text-xl text-center uppercase tracking-widest mb-4 mt-2">
              GAME SETTINGS
            </h2>
            <div className="w-full border-2 border-black flex flex-col bg-white overflow-hidden opacity-70">
               <div className="h-40 bg-white"></div>
            </div>
          </div>

          <div className="w-full bg-[#0a0088] flex flex-col p-4 shadow-lg mx-auto border-t-2 border-slate-700">
             <h2 className="text-white font-black text-xl text-center uppercase tracking-widest mb-2 mt-2">
               SHUFFLE YOUR TICKET
             </h2>
             <div className="h-32 bg-slate-200 opacity-20"></div>
          </div>

        </div>
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center">
          <div className="w-[70%] max-w-sm bg-[#ff0000] text-white font-bold text-base py-2.5 rounded-lg shadow-lg text-center opacity-70">
            BOOK TICKET
          </div>
        </div>
      </div>
      
      {/* --- DARK OVERLAY --- */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-10" />

      {/* --- MODAL CONTENT --- */}
      <div className="relative z-20 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[340px] bg-[#12c4e8] border-[6px] border-[#0a0088] rounded-md shadow-2xl p-6 sm:p-8 flex flex-col items-center space-y-6">
          
          {/* URL-driven error banners */}
          {urlError === "unauthorized" && (
            <div className="w-full rounded bg-red-600/90 p-2 text-center text-xs font-bold text-white shadow-md">
              Session expired. Please log in again.
            </div>
          )}
          {urlError === "tenant_mismatch" && (
            <div className="w-full rounded bg-red-600/90 p-2 text-center text-xs font-bold text-white shadow-md">
              Session conflict. Please sign in again.
            </div>
          )}
          {urlError === "wrong_role" && (
            <div className="w-full rounded bg-amber-600/90 p-2 text-center text-xs font-bold text-white shadow-md">
              Account lacks admin access.
            </div>
          )}

          <h2 className="text-white text-2xl sm:text-3xl font-black tracking-wide">
            Login
          </h2>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="w-full flex flex-col items-center space-y-4"
          >
            <div className="w-full relative">
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin pass"
                className="w-full rounded-md border-0 bg-white px-4 py-2.5 text-sm text-center text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0a0088]"
              />
            </div>

            {error && (
              <p className="w-full text-center rounded bg-red-600/90 px-2 py-1 text-xs font-bold text-white">
                {error}
              </p>
            )}


            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="w-[90%] rounded-md bg-[#ff0000] hover:bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner /> Signing in...</> : "SIGN IN"}
            </button>

            <div className="text-white text-2xl font-serif font-bold mt-2">
              or
            </div>

            <button
              type="button"
              className="w-full rounded-md bg-[#422197] hover:bg-[#341879] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition-colors"
            >
              send password to email
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
