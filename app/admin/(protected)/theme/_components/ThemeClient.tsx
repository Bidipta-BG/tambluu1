"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/cn";
import type { Theme, Tenant } from "@/types";

interface ThemeClientProps {
  tenantId: string;
  initialTenant: Tenant;
  themes: Theme[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function ThemeClient({ tenantId, initialTenant, themes }: ThemeClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [activeThemeId, setActiveThemeId] = useState<string | null>(initialTenant.themeId);
  const [loadingThemeId, setLoadingThemeId] = useState<string | null>(null);

  // Overrides state
  const initialOverrides = (initialTenant.themeOverrides as any) || {};
  const [primaryColor, setPrimaryColor] = useState(initialOverrides.primaryColor || "#8b5cf6"); // violet-500 default
  const [savingOverrides, setSavingOverrides] = useState(false);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function handleSelectTheme(themeId: string) {
    if (themeId === activeThemeId) return;

    setLoadingThemeId(themeId);
    
    // Optimistic update
    const prevThemeId = activeThemeId;
    setActiveThemeId(themeId);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("No active session");

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/theme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ themeId }),
      });

      if (!res.ok) throw new Error("Failed to update theme");

      showToast("Theme applied successfully!", "success");
      router.refresh();
    } catch (err: any) {
      setActiveThemeId(prevThemeId); // revert
      showToast(err.message, "error");
    } finally {
      setLoadingThemeId(null);
    }
  }

  async function handleSaveOverrides() {
    setSavingOverrides(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("No active session");

      // We PATCH the overrides object specifically
      const res = await fetch(`${API_BASE}/tenants/${tenantId}/theme-overrides`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          primaryColor 
          // logoUrl would go here eventually
        }),
      });

      if (!res.ok) throw new Error("Failed to save overrides");

      showToast("Theme overrides saved!", "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSavingOverrides(false);
    }
  }

  const handleLogoUploadStub = () => {
    alert("Logo upload is currently a stub. A Supabase Storage bucket and upload endpoint are required to complete this feature.");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-50">Theme Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Customize the look and feel of your player portal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Themes & Overrides */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Themes Grid */}
          <section>
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Available Themes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {themes.length === 0 ? (
                <div className="col-span-full p-8 text-center border border-slate-800 border-dashed rounded-xl">
                  <p className="text-slate-500 text-sm">No themes found.</p>
                </div>
              ) : (
                themes.map((theme) => {
                  const isActive = theme.id === activeThemeId;
                  const isLoading = theme.id === loadingThemeId;

                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleSelectTheme(theme.id)}
                      disabled={isLoading}
                      className={cn(
                        "group relative flex flex-col text-left rounded-2xl border bg-slate-900 overflow-hidden transition-all text-sm",
                        isActive 
                          ? "border-violet-500 shadow-lg shadow-violet-500/20 ring-1 ring-violet-500" 
                          : "border-slate-800 hover:border-slate-600 hover:shadow-md"
                      )}
                    >
                      <div className="aspect-video w-full bg-slate-800 relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={theme.preview_image_url || `https://placehold.co/600x400/1e293b/475569?text=${encodeURIComponent(theme.name)}`}
                          alt={theme.name}
                          className={cn(
                            "w-full h-full object-cover transition-transform duration-300",
                            !isActive && "group-hover:scale-105"
                          )}
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center backdrop-blur-[2px]">
                            <div className="bg-violet-600 text-white px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-2">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Active
                            </div>
                          </div>
                        )}
                        {isLoading && (
                          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-sm">
                            <span className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className={cn("font-semibold", isActive ? "text-violet-400" : "text-slate-200")}>
                          {theme.name}
                        </h3>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Overrides */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-5">Theme Overrides</h2>
            
            <div className="space-y-6">
              
              {/* Primary Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Primary Brand Color</label>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg shadow-inner border border-slate-700 overflow-hidden shrink-0 relative cursor-pointer">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-32 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none uppercase font-mono focus:border-violet-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Used for primary buttons, highlights, and active states.</p>
              </div>

              {/* Logo Upload */}
              <div className="pt-4 border-t border-slate-800">
                <label className="mb-2 block text-sm font-medium text-slate-400">Brand Logo</label>
                <div 
                  onClick={handleLogoUploadStub}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 hover:border-violet-500/50 transition-colors group"
                >
                  <svg className="h-8 w-8 text-slate-500 group-hover:text-violet-400 mb-2 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm font-medium text-slate-300">Click to upload logo</span>
                  <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveOverrides}
                  disabled={savingOverrides}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {savingOverrides ? "Saving..." : "Save Overrides"}
                </button>
              </div>

            </div>
          </section>
        </div>

        {/* Right Col: Live Preview */}
        <div className="space-y-6">
          <section className="sticky top-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Live Preview
            </h2>
            <p className="text-xs text-slate-400 mb-6">See how your changes affect the player portal.</p>

            {/* Mockup Phone Frame */}
            <div className="w-full max-w-[280px] mx-auto aspect-[9/19] rounded-[2rem] border-8 border-slate-950 bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col">
              
              {/* Mock App Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between" style={{ backgroundColor: `${primaryColor}20` }}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: primaryColor }}>
                    TL
                  </div>
                  <span className="font-bold text-slate-200 text-sm">{initialTenant.businessName}</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                  <div className="w-3 h-0.5 bg-slate-500 rounded-full" />
                </div>
              </div>

              {/* Mock App Body */}
              <div className="flex-1 p-4 flex flex-col gap-4">
                
                {/* Mock Banner */}
                <div 
                  className="w-full h-24 rounded-xl relative overflow-hidden flex items-end p-3"
                  style={{ 
                    backgroundImage: activeTheme ? `url(${activeTheme.preview_image_url})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: primaryColor // fallback
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="relative font-bold text-white text-lg">Sunday Mega Game</span>
                </div>

                {/* Mock Ticket Button */}
                <button 
                  className="w-full py-3 rounded-lg font-bold text-white shadow-lg text-sm mt-auto"
                  style={{ backgroundColor: primaryColor }}
                >
                  Buy Ticket
                </button>
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-slate-600 rounded-full" />
            </div>

          </section>
        </div>

      </div>

    </div>
  );
}
