"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { Spinner } from "@/components/Spinner";
import type { Tenant } from "@/types";

const AVAILABLE_THEMES = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Festival Dash" },
  { id: "55555555-5555-5555-5555-555555555555", name: "Color Splash" },
];

export function NewGameSettingsSection({ 
  tenant 
}: { 
  tenant: Tenant;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [gameName, setGameName] = useState(tenant.gameName || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Theme store state
  const [isThemeStoreOpen, setIsThemeStoreOpen] = useState(false);
  const [loadingThemeId, setLoadingThemeId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!gameName.trim()) {
      showToast("Game Title cannot be empty.", "error");
      return;
    }
    
    setIsSubmitting(true);
    showLoader("Saving Game Title...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenant.id}`, {
        game_name: gameName.trim(),
      }, { headers });
      
      showToast("Game Title updated successfully!", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to update Game Title", "error");
    } finally {
      setIsSubmitting(false);
      hideLoader();
    }
  };

  const handleInstallTheme = async (themeId: string) => {
    setLoadingThemeId(themeId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };
      
      // Call the domain-based API we just created!
      await api.post(`/themes/update-by-domain`, { 
        domain: tenant.domain, 
        themeId: themeId 
      }, { headers });
      
      showToast("Theme installed successfully! Your player page will now use this theme.", "success");
      setIsThemeStoreOpen(false);
      router.refresh();
    } catch (e: any) {
      showToast("Error installing theme: " + e.message, "error");
    } finally {
      setLoadingThemeId(null);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto mb-10">
        {/* Installed Version Section */}
        <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden shadow-xl mb-6 flex items-center justify-center p-6">
          <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase">
            INSTALLED VERSION IS V1.0
          </h2>
        </div>

        {/* Game Title & Theme Store Section */}
        <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden shadow-xl p-4 md:p-6 flex flex-col items-center">
          
          <h3 className="text-white font-black text-lg md:text-xl tracking-wide mb-3">
            Game Title
          </h3>
          
          <div className="flex w-full max-w-sm mb-6 rounded overflow-hidden">
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="flex-1 px-3 py-2 font-bold text-black outline-none"
              placeholder="Game Title"
              disabled={isSubmitting}
            />
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-black text-white font-bold px-6 py-2 border-l border-gray-600 hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[100px]"
            >
              {isSubmitting ? <><Spinner /> SAVING</> : "SAVE"}
            </button>
          </div>

          <button
            onClick={() => setIsThemeStoreOpen(true)}
            className="w-full max-w-sm bg-[#ff0000] hover:bg-red-700 text-white font-black text-lg md:text-xl py-3 rounded transition-colors shadow-lg"
          >
            THEME STORE
          </button>
        </div>
      </div>

      {/* Theme Store Modal */}
      {isThemeStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-bold text-white">Theme Store</h2>
                <p className="text-slate-400 text-sm mt-1">Select a theme below to instantly apply it to your tenant.</p>
              </div>
              <button 
                onClick={() => setIsThemeStoreOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Scrollable Content (Images Grid) */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {AVAILABLE_THEMES.map((theme) => {
                  const isInstalled = tenant.themeId === theme.id;
                  
                  return (
                    <div 
                      key={theme.id} 
                      className={`group relative bg-slate-800 border-2 rounded-xl overflow-hidden transition cursor-pointer flex flex-col shadow-lg
                        ${isInstalled ? 'border-green-500 ring-2 ring-green-500/20' : 'border-slate-700 hover:border-indigo-500'}
                      `}
                      onClick={() => !isInstalled && handleInstallTheme(theme.id)}
                    >
                      {/* Image container */}
                      <div className="aspect-video bg-slate-800 relative overflow-hidden">
                        <img 
                          src={`/themes/${theme.id}.jpg`} 
                          alt={theme.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                        
                        {/* Overlay on hover */}
                        {(!isInstalled && loadingThemeId !== theme.id) && (
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/60 transition-all flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 text-white font-bold bg-indigo-600 px-6 py-3 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                              Apply Theme
                            </span>
                          </div>
                        )}
                        
                        {/* Loading spinner */}
                        {loadingThemeId === theme.id && (
                          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-white font-semibold">Applying...</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Theme Details Footer */}
                      <div className="p-5 flex justify-between items-center bg-slate-800 border-t border-slate-700">
                        <h3 className="font-bold text-white text-lg">{theme.name}</h3>
                        {isInstalled && (
                          <span className="text-green-400 font-bold text-sm bg-green-400/10 px-4 py-1.5 rounded-full border border-green-400/20 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            Active Theme
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
