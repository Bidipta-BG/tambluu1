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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    
    // Clean name for email generation just like backend does
    const cleanNameForEmail = identifier.trim().replace(/\s+/g, '_').toLowerCase();
    
    // Must match the tenant-scoped convention used when the agent was created
    const fakeEmail = `${tenantId}_${cleanNameForEmail}@agent.tambola.com`;

    // Pad the password exactly as the backend does to bypass Supabase's 6 char limit
    const paddedPassword = password + '_TblPadX9!';

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password: paddedPassword,
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
    <div className="relative min-h-screen font-sans bg-black overflow-hidden">
      {/* --- MOCK DASHBOARD BACKGROUND --- */}
      <div className="absolute inset-0 pointer-events-none opacity-40 blur-[3px] p-2 sm:p-4 pb-20">
        <div className="w-full max-w-xl mx-auto space-y-6 sm:space-y-8">
          
          <div className="w-full flex flex-col items-center mx-auto space-y-4">
            <div className="w-full bg-[#0a0088] py-4 flex justify-center items-center">
              <h1 className="text-white font-black text-xl sm:text-2xl tracking-widest uppercase">
                AGENT DASHBOARD
              </h1>
            </div>
            
            <div className="w-full bg-[#8b8b00] py-3 flex justify-center items-center">
              <span className="text-black font-black text-lg uppercase tracking-wide">
                TOTAL EARNING
              </span>
            </div>
            
            <div className="w-full h-32 bg-[#4a0000] rounded border border-[#2a0000]"></div>
          </div>
          
          <div className="w-full bg-[#0a0088] flex flex-col p-4">
             <div className="h-40 bg-white opacity-10"></div>
          </div>

        </div>
      </div>
      
      {/* --- DARK OVERLAY --- */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none z-10" />

      {/* --- MODAL CONTENT --- */}
      <div className="relative z-20 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[320px] bg-[#00d0f5] border-[5px] border-[#1300ff] rounded-lg shadow-2xl p-6 flex flex-col items-center space-y-5">
          
          <h2 className="text-white font-medium text-[22px] tracking-wide mb-1">
            Login
          </h2>

          {/* URL-driven error banners */}
          {urlError === "tenant_mismatch" && (
            <div className="w-full rounded bg-red-600/90 p-2 text-center text-xs font-bold text-white shadow-md">
              Session conflict.
            </div>
          )}
          {urlError === "wrong_role" && (
            <div className="w-full rounded bg-red-600/90 p-2 text-center text-xs font-bold text-white shadow-md">
              Your account doesn't have agent access.
            </div>
          )}

          {!tenantId && (
            <div className="w-full rounded bg-red-600/90 p-2 text-center text-[10px] font-bold text-white shadow-md leading-tight">
              Developer: No tenant ID detected.
            </div>
          )}

          {error && (
            <div className="w-full rounded bg-red-600/90 p-2 text-center text-xs font-bold text-white shadow-md">
              {error}
            </div>
          )}

          <form
            id="agent-login-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4 w-full"
          >
            <input
              id="agent-identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Agent name"
              className="w-full rounded-[6px] border-0 px-3 py-2.5 text-sm text-black placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />

            <input
              id="agent-password"
              type="text"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Agent pass"
              className="w-full rounded-[6px] border-0 px-3 py-2.5 text-sm text-black placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[6px] bg-[#ff0000] px-4 py-2.5 text-[15px] font-medium text-white transition hover:bg-red-700 disabled:opacity-70 mt-1 shadow-sm uppercase tracking-wide"
            >
              {loading ? "Signing In..." : "SIGN IN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
