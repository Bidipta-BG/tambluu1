"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";

interface AgentInfo {
  id: string;
  name: string;
  phone?: string;
  telegram_username?: string;
  sms_number?: string;
  email_id?: string;
  plain_password?: string;
}

interface Props {
  agentInfo: AgentInfo | null;
  tenantId: string;
}

export function NewAgentInfoSection({ agentInfo, tenantId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();

  const handleLogout = async () => {
    showLoader("Logging out...");
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/agent/login");
    } catch (e: any) {
      showToast(e.message || "Failed to log out", "error");
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="w-full flex flex-col shadow-lg border-2 border-transparent border-t-[#4a4a8a] border-b-[#050040]">
      <div className="w-full bg-[#0a0088] py-4 flex justify-center items-center">
        <h2 className="text-white font-black text-xl sm:text-2xl tracking-wide uppercase">
          AGENT INFO
        </h2>
      </div>
      <div className="w-full bg-[#0a0088] px-3 pb-3">
          
          <div className="flex w-full bg-black text-white border-b border-black">
            <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm border-r border-black flex items-center">
              Settings type
            </div>
            <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm flex items-center">
              Settings value
            </div>
          </div>

          <div className="w-full space-y-[1px]">
            {/* Agent Name */}
            <div className="flex w-full bg-white border border-black min-h-[40px] sm:min-h-[44px]">
              <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black border-r border-black flex items-center">
                Agent name
              </div>
              <div className="w-1/2 flex items-center p-2.5 sm:p-3 font-bold text-black text-[13px] sm:text-sm">
                {agentInfo?.name || ""}
              </div>
            </div>

            {/* Agent Phone */}
            <div className="flex w-full bg-white border border-black min-h-[40px] sm:min-h-[44px]">
              <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black border-r border-black flex items-center">
                Agent phone
              </div>
              <div className="w-1/2 flex items-center p-2.5 sm:p-3 font-bold text-black text-[13px] sm:text-sm">
                {agentInfo?.phone || ""}
              </div>
            </div>

            {/* Agent Telegram */}
            <div className="flex w-full bg-white border border-black min-h-[40px] sm:min-h-[44px]">
              <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black border-r border-black flex items-center">
                Agent telegram
              </div>
              <div className="w-1/2 flex items-center p-2.5 sm:p-3 font-bold text-black text-[13px] sm:text-sm">
                {agentInfo?.telegram_username || ""}
              </div>
            </div>

            {/* Agent SMS */}
            <div className="flex w-full bg-white border border-black min-h-[40px] sm:min-h-[44px]">
              <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black border-r border-black flex items-center">
                Agent sms
              </div>
              <div className="w-1/2 flex items-center p-2.5 sm:p-3 font-bold text-black text-[13px] sm:text-sm">
                {agentInfo?.sms_number || ""}
              </div>
            </div>

            {/* Agent Email */}
            <div className="flex w-full bg-white border border-black min-h-[40px] sm:min-h-[44px]">
              <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black border-r border-black flex items-center">
                Agent email
              </div>
              <div className="w-1/2 flex items-center p-2.5 sm:p-3 font-bold text-black text-[13px] sm:text-sm">
                {agentInfo?.email_id || ""}
              </div>
            </div>

            {/* Agent Password */}
            <div className="flex w-full bg-white border border-black min-h-[40px] sm:min-h-[44px]">
              <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black border-r border-black flex items-center">
                Agent password
              </div>
              <div className="w-1/2 flex items-center p-2.5 sm:p-3 font-bold text-black text-[13px] sm:text-sm">
                {agentInfo?.plain_password || ""}
              </div>
            </div>

          </div>
      </div>

      {/* LOG OUT Button */}
      <div className="w-full bg-[#0a0088] flex justify-center pb-8 pt-6">
        <button 
          onClick={handleLogout}
          className="bg-[#ff0000] hover:bg-red-700 text-white font-black text-xl sm:text-2xl px-12 py-3 rounded-lg shadow-xl uppercase tracking-widest transition-colors w-[90%] max-w-[280px]"
        >
          LOG OUT
        </button>
      </div>

    </div>
  );
}
