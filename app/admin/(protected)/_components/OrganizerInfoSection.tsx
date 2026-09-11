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
  
  const [adminName, setAdminName] = useState(tenant.ownerName || "");
  const [adminPhone, setAdminPhone] = useState(tenant.ownerPhone || "");
  const [recoveryEmail, setRecoveryEmail] = useState(tenant.recoveryEmail || tenant.ownerEmail || "");
  
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.whatsappNumber || tenant.ownerPhone || "");
  const [groupLink, setGroupLink] = useState(tenant.whatsappGroupLink || "");
  const [telegramLink, setTelegramLink] = useState(tenant.telegramLink || "");
  
  const [whatsappActive, setWhatsappActive] = useState(tenant.whatsappActive ?? true);
  const [telegramActive, setTelegramActive] = useState(tenant.telegramActive ?? false);
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    showLoader("Saving Config...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenant.id}`, {
        owner_name: adminName,
        owner_phone: adminPhone,
        recovery_email: recoveryEmail,
        organizer_whatsapp_number: whatsappNumber,
        organizer_whatsapp_group_link: groupLink,
        telegram_link: telegramLink,
        whatsapp_active: whatsappActive,
        telegram_active: telegramActive,
      }, { headers });
      
      showToast("Site configuration saved successfully!", "success");
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
      <h2 className="text-lg font-bold text-white mb-4">Profile & Contact Settings</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Admin Name</label>
          <input 
            type="text" 
            placeholder="John Doe"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Admin Phone</label>
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <span className="flex items-center justify-center px-3 bg-slate-700 text-slate-300 text-sm border-r border-slate-600">
              +91
            </span>
            <input 
              type="text" 
              placeholder="9876543210"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              className="flex-1 bg-slate-800 px-3 py-2 text-white text-sm outline-none"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Recovery Email</label>
          <input 
            type="email" 
            placeholder="backup@example.com"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div className="h-px w-full bg-slate-800 mb-6"></div>
      
      <h3 className="text-sm font-bold text-slate-300 mb-3">Player Page Contact Links</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Telegram Link</label>
          <input 
            type="url" 
            placeholder="https://t.me/yourchannel"
            value={telegramLink}
            onChange={(e) => setTelegramLink(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only"
              checked={whatsappActive}
              onChange={(e) => setWhatsappActive(e.target.checked)}
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${whatsappActive ? 'bg-green-500' : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${whatsappActive ? 'transform translate-x-4' : ''}`}></div>
          </div>
          <span className="text-sm font-medium text-slate-300">WhatsApp Active</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only"
              checked={telegramActive}
              onChange={(e) => setTelegramActive(e.target.checked)}
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${telegramActive ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${telegramActive ? 'transform translate-x-4' : ''}`}></div>
          </div>
          <span className="text-sm font-medium text-slate-300">Telegram Active</span>
        </label>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-6 rounded-lg text-sm transition"
      >
        {loading ? "Saving..." : "Save Config"}
      </button>
    </div>
  );
}
