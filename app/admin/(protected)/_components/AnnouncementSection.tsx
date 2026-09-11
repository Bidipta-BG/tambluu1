"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Tenant } from "@/types";

export default function AnnouncementSection({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();
  
  const [text, setText] = useState(tenant.announcementText || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    showLoader("Saving Announcement...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenant.id}`, {
        announcement_text: text || null,
      }, { headers });
      
      showToast("Announcement saved successfully!", "success");
      showLoader("Refreshing Dashboard...");
      router.refresh();
      setTimeout(() => { hideLoader(); setLoading(false); }, 500);
    } catch (e: any) {
      showToast(e.message || "Failed to save announcement", "error");
      setLoading(false);
      hideLoader();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="text-xl font-bold text-white mb-2">Announcement Banner</h2>
      <p className="text-sm text-slate-400 mb-4">
        This text will appear as a banner on the game page 3 seconds after players
        dismiss the initial announcement. Leave blank to show "Good luck, have fun!"
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g. "Tonight&#39;s jackpot is ₹5000! Best of luck to all players!"'
        rows={3}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500 resize-none"
      />
      <div className="mt-4 flex justify-end">
        <button 
          onClick={handleSave} 
          disabled={loading || text === (tenant.announcementText || "")}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg text-sm transition"
        >
          {loading ? "Saving..." : "Save Announcement"}
        </button>
      </div>
    </div>
  );
}
