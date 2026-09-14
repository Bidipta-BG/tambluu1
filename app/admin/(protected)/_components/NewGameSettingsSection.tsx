"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";

export function NewGameSettingsSection({ 
  tenantId, 
  initialGameName 
}: { 
  tenantId: string;
  initialGameName: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [gameName, setGameName] = useState(initialGameName || "");

  const handleSave = async () => {
    if (!gameName.trim()) {
      showToast("Game Title cannot be empty.", "error");
      return;
    }
    
    showLoader("Saving Game Title...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenantId}`, {
        game_name: gameName.trim(),
      }, { headers });
      
      showToast("Game Title updated successfully!", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to update Game Title", "error");
    } finally {
      hideLoader();
    }
  };

  return (
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
          />
          <button
            onClick={handleSave}
            className="bg-black text-white font-bold px-6 py-2 border-l border-gray-600 hover:bg-gray-900 transition-colors"
          >
            SAVE
          </button>
        </div>

        <button
          onClick={() => showToast("Theme Store coming soon!", "info")}
          className="w-full max-w-sm bg-[#ff0000] hover:bg-red-700 text-white font-black text-lg md:text-xl py-3 rounded transition-colors"
        >
          THEME STORE
        </button>
      </div>
    </div>
  );
}
