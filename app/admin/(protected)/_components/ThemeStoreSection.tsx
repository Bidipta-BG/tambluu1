"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Tenant } from "@/types";

interface ThemeStoreSectionProps {
  tenant: Tenant;
}

const AVAILABLE_THEMES = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Festival Dash" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Northeast Essence" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Royal Tambola" },
  { id: "44444444-4444-4444-4444-444444444444", name: "Neon Night" },
  { id: "55555555-5555-5555-5555-555555555555", name: "Color Splash" },
];

export default function ThemeStoreSection({ tenant }: ThemeStoreSectionProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleInstall = async (themeId: string) => {
    setLoadingId(themeId);
    try {
      await api.patch(`/tenants/${tenant.id}`, { theme_id: themeId });
      alert("Theme installed successfully! Your player page will now use this theme.");
      router.refresh();
    } catch (e: any) {
      alert("Error installing theme: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpdate = () => {
    alert("System is up to date!");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">Theme Store</h2>
        <button 
          onClick={handleUpdate}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1 transition"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Update Now
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {AVAILABLE_THEMES.map((theme) => {
          const isInstalled = tenant.themeId === theme.id;
          return (
            <div key={theme.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-col justify-between shadow-sm">
              <div className="h-24 bg-slate-700 rounded border border-slate-600 mb-3 flex items-center justify-center">
                <span className="text-slate-500 text-xs text-center px-2">{theme.name} Preview</span>
              </div>
              <h3 className="text-sm font-semibold text-white text-center mb-3 line-clamp-1">{theme.name}</h3>
              {isInstalled ? (
                <button disabled className="w-full bg-slate-700 text-green-400 font-bold py-1.5 rounded text-xs border border-green-900/50">
                  Installed ✓
                </button>
              ) : (
                <button 
                  onClick={() => handleInstall(theme.id)}
                  disabled={loadingId !== null}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded text-xs transition"
                >
                  {loadingId === theme.id ? "Installing..." : "Install Now"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
