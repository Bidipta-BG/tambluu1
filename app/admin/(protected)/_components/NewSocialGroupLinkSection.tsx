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

export function NewSocialGroupLinkSection({ tenant }: Props) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();

  const [groupLink, setGroupLink] = useState(tenant.whatsappGroupLink || "");

  const handleSave = async () => {
    showLoader("Saving Group Link...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Patch tenant info using the same field as site configuration
      await api.patch(`/tenants/${tenant.id}`, {
        organizer_whatsapp_group_link: groupLink,
      }, { headers });

      showToast("Group link saved successfully!", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to save link", "error");
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl p-0">
      {/* Header */}
      <div className="p-4 bg-[#0b00c4] text-center">
        <h2 className="text-white font-black text-xl md:text-2xl tracking-wide">
          Social group link
        </h2>
      </div>

      {/* Table Container */}
      <div className="bg-[#0b00c4] px-2 pb-2">
        {/* Table Headers */}
        <div className="flex border-b border-black h-10 bg-black">
          <div className="w-1/2 flex items-center px-3 border-r border-black font-bold text-white text-sm">
            Data type
          </div>
          <div className="w-1/2 flex items-center px-3 font-bold text-white text-sm">
            Data value
          </div>
        </div>

        {/* Table Rows */}
        <div className="bg-white">
          <div className="flex border-b border-black">
            <div className="w-1/2 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Enter group app name
            </div>
            <div className="w-1/2 flex items-center px-3 font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Whatsapp
            </div>
          </div>

          <div className="flex border-b border-black">
            <div className="w-1/2 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Provide group link
            </div>
            <div className="w-1/2 flex items-center">
              <input
                type="text"
                value={groupLink}
                onChange={(e) => setGroupLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full h-full px-3 font-bold text-black text-[13px] sm:text-sm md:text-base outline-none bg-transparent py-2"
              />
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex bg-[#0b00c4] pt-2 h-14">
          <div className="w-1/2"></div>
          <div className="w-1/2 flex">
            <button 
              onClick={handleSave}
              className="w-full bg-[#ff0000] hover:bg-red-700 text-white font-black uppercase text-sm md:text-base tracking-wide flex items-center justify-center transition-colors border border-red-800"
            >
              SAVE INFO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
