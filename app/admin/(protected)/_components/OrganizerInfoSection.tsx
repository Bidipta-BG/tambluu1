"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Tenant } from "@/types";

interface OrganizerInfoSectionProps {
  tenant: Tenant;
}

export default function OrganizerInfoSection({ tenant }: OrganizerInfoSectionProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();
  
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.whatsappNumber || "");
  const [groupLink, setGroupLink] = useState(tenant.whatsappGroupLink || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    showLoader("Saving Organizer Info...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenant.id}`, {
        organizer_whatsapp_number: whatsappNumber,
        organizer_whatsapp_group_link: groupLink,
      }, { headers });
      
      showToast("Organizer info saved successfully!", "success");
      showLoader("Refreshing Dashboard...");
      router.refresh();
      setTimeout(() => { hideLoader(); setLoading(false); }, 500);
    } catch (e: any) {
      showToast(e.message || "Failed to save info", "error");
      setLoading(false);
      hideLoader();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
      <h2 className="text-lg font-bold text-white mb-4">Renewal Instructions / Organizer Info</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">WhatsApp Number</label>
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <span className="flex items-center justify-center px-3 bg-slate-700 text-slate-300 text-sm border-r border-slate-600">
              +91
            </span>
            <input 
              type="text" 
              placeholder="9876543210"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="flex-1 bg-slate-800 px-3 py-2 text-white text-sm outline-none"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">WhatsApp Group Link</label>
          <input 
            type="url" 
            placeholder="https://chat.whatsapp.com/..."
            value={groupLink}
            onChange={(e) => setGroupLink(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg text-sm transition"
      >
        {loading ? "Saving..." : "Save Info"}
      </button>
    </div>
  );
}
