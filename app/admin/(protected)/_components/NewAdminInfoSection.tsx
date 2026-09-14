"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Tenant } from "@/types";

interface Props {
  tenant: Tenant;
}

export function NewAdminInfoSection({ tenant }: Props) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();

  const [adminName, setAdminName] = useState(tenant.ownerName || "");
  const [recoveryEmail, setRecoveryEmail] = useState(tenant.recoveryEmail || tenant.ownerEmail || "");
  const [adminPhone, setAdminPhone] = useState(tenant.ownerPhone || "");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState(tenant.whatsappGroupLink || "");
  const [adminPassword, setAdminPassword] = useState(""); // Blank by default

  const handleSave = async () => {
    showLoader("Saving Admin Info...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Patch tenant info
      await api.patch(`/tenants/${tenant.id}`, {
        owner_name: adminName,
        recovery_email: recoveryEmail,
        owner_phone: adminPhone,
        organizer_whatsapp_group_link: whatsappGroupLink,
      }, { headers });

      // Update password if provided
      if (adminPassword) {
        if (adminPassword.length < 4) {
          throw new Error("Password must be at least 4 characters.");
        }
        const { error } = await supabase.auth.updateUser({ password: adminPassword });
        if (error) throw error;
      }

      showToast("Admin info saved successfully!", "success");
      setAdminPassword(""); // clear after save
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to save info", "error");
    } finally {
      hideLoader();
    }
  };

  const handleLogout = async () => {
    showLoader("Logging out...");
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/admin/login";
    } catch (e) {
      hideLoader();
    }
  };

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-[#0b00c4] text-center">
        <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase">
          ADMIN INFO
        </h2>
      </div>

      {/* Table Container */}
      <div className="bg-[#0b00c4] px-2 pb-2">
        {/* Table Headers */}
        <div className="flex border-b border-black h-10 bg-black">
          <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-white text-sm">
            Settings type
          </div>
          <div className="flex-1 flex items-center px-3 font-bold text-white text-sm">
            Settings value
          </div>
        </div>

        {/* Table Rows */}
        <div className="bg-white">
          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Admin name
            </div>
            <div className="flex-1 flex items-center">
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full h-full px-3 font-bold text-black text-[13px] sm:text-sm md:text-base outline-none bg-transparent py-2"
              />
            </div>
          </div>

          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Recovery email
            </div>
            <div className="flex-1 flex items-center">
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="w-full h-full px-3 font-bold text-black text-[13px] sm:text-sm md:text-base outline-none bg-transparent py-2"
              />
            </div>
          </div>

          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Admin phone
            </div>
            <div className="flex-1 flex items-center">
              <input
                type="text"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="w-full h-full px-3 font-bold text-black text-[13px] sm:text-sm md:text-base outline-none bg-transparent py-2"
              />
            </div>
          </div>

          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Whatsapp group link
            </div>
            <div className="flex-1 flex items-center">
              <input
                type="text"
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
                className="w-full h-full px-3 font-bold text-black text-[13px] sm:text-sm md:text-base outline-none bg-transparent py-2"
              />
            </div>
          </div>

          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Admin password
            </div>
            <div className="flex-1 flex items-center">
              <input
                type="text" // Note: The user screenshot shows "12345" plainly, so text is appropriate here to match UI exactly
                placeholder="••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full h-full px-3 font-bold text-black text-[13px] sm:text-sm md:text-base outline-none bg-transparent py-2 placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex bg-[#0b00c4] pt-2 gap-0 h-14">
          <button 
            onClick={handleLogout}
            className="flex-1 bg-[#404040] hover:bg-[#202020] text-white font-black uppercase text-sm md:text-base tracking-wide flex items-center justify-center transition-colors border border-black"
          >
            LOG OUT
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-sm md:text-base tracking-wide flex items-center justify-center transition-colors border border-red-800"
          >
            SAVE INFO
          </button>
        </div>
      </div>
    </div>
  );
}
