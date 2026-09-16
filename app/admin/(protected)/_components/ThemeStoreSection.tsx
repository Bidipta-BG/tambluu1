"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Tenant } from "@/types";

interface ThemeStoreSectionProps {
  tenant: Tenant;
}

const AVAILABLE_THEMES = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Festival Dash" },
  { id: "55555555-5555-5555-5555-555555555555", name: "Color Splash" },
];

export default function ThemeStoreSection({ tenant }: ThemeStoreSectionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleInstall = async (themeId: string) => {
    setLoadingId(themeId);
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
      
      alert("Theme installed successfully! Your player page will now use this theme.");
      setIsOpen(false);
      router.refresh();
    } catch (e: any) {
      alert("Error installing theme: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Theme Store</h2>
          <p className="text-slate-400 text-sm">Discover and apply beautiful themes to your Tambola game board.</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Open Theme Store
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-bold text-white">Theme Store</h2>
                <p className="text-slate-400 text-sm mt-1">Select a theme below to instantly apply it to your tenant.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
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
                      onClick={() => !isInstalled && handleInstall(theme.id)}
                    >
                      {/* Image container */}
                      <div className="aspect-video bg-slate-800 relative overflow-hidden">
                        <img 
                          src={`/themes/${theme.id}.jpg`} 
                          alt={theme.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                        
                        {/* Overlay on hover */}
                        {(!isInstalled && loadingId !== theme.id) && (
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/60 transition-all flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 text-white font-bold bg-indigo-600 px-6 py-3 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                              Apply Theme
                            </span>
                          </div>
                        )}
                        
                        {/* Loading spinner */}
                        {loadingId === theme.id && (
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
