"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Tenant } from "@/types";

interface WebsiteStatusSectionProps {
  tenant: Tenant;
}

export default function WebsiteStatusSection({ tenant }: WebsiteStatusSectionProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();
  
  const [websiteStatus, setWebsiteStatus] = useState<"open" | "closed">(tenant.websiteStatus || "open");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    showLoader("Saving Website Status...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenant.id}`, {
        website_status: websiteStatus,
      }, { headers });
      
      showToast("Website status updated successfully!", "success");
      showLoader("Refreshing Dashboard...");
      router.refresh();
      setTimeout(() => { hideLoader(); setLoading(false); }, 500);
    } catch (e: any) {
      showToast(e.message || "Failed to save website status", "error");
      setLoading(false);
      hideLoader();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
      <h2 className="text-lg font-bold text-white mb-2">Website Status</h2>
      <p className="text-sm text-slate-400 mb-4">
        Controls whether the player-facing website is visible to the public. This acts as a master switch for your entire game site.
      </p>
      
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
        <select 
          value={websiteStatus}
          onChange={(e) => setWebsiteStatus(e.target.value as "open" | "closed")}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500 appearance-none"
        >
          <option value="open">Open (Website is live)</option>
          <option value="closed">Closed (Website is offline)</option>
        </select>
        
        {websiteStatus === "closed" && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <strong>Warning:</strong> Players will see an offline screen. All game activity will be hidden until you open the website again.
          </div>
        )}
      </div>

      <button 
        onClick={handleSave}
        disabled={loading || websiteStatus === tenant.websiteStatus}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg text-sm transition"
      >
        {loading ? "Saving..." : "Save Status"}
      </button>
    </div>
  );
}
