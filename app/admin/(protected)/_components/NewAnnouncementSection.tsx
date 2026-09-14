"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Tenant } from "@/types";

export default function NewAnnouncementSection({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();
  
  const defaultMsg = "Hi players. Best wishes for upcoming game...";
  const [text, setText] = useState(tenant.announcementText || defaultMsg);
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
    <div className="w-full bg-[#0a0088] flex flex-col items-center p-4 shadow-lg mx-auto max-w-xl text-center">
      <h2 className="text-white font-black text-lg sm:text-xl uppercase tracking-wider mb-3">
        ANNOUNCEMENT TO PLAYERS
      </h2>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full bg-white border-none rounded-lg p-3 text-black font-semibold text-sm outline-none resize-none shadow-inner"
      />

      <div className="mt-4 flex justify-center">
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-[#0b8026] active:bg-[#09691f] text-white font-black text-xs sm:text-sm py-2 px-6 rounded-full shadow-md transition-colors uppercase tracking-wide disabled:opacity-50"
        >
          {loading ? "SENDING..." : "SEND NEW ANNOUNCEMENT"}
        </button>
      </div>
    </div>
  );
}
