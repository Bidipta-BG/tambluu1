"use client";

import React, { useState, useEffect } from "react";
import type { Tenant, SubscriptionStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

interface Props {
  tenant: Tenant;
}

export function NewLinkInfoSection({ tenant }: Props) {
  const { showToast } = useToast();
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSub() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        const res = await fetch(`${API_BASE}/tenants/${tenant.id}/subscription-status`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Accept: "application/json",
          }
        });
        if (res.ok) {
          const json = await res.json();
          setSubStatus(json.data as SubscriptionStatus);
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSub();
  }, [tenant.id]);

  const baseDomain = tenant.domain || (typeof window !== "undefined" ? window.location.host : "meghaonlinetambola.com");

  // Format dates matching "DD-MM-YYYY hh:mm:ss A"
  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return "Loading...";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Invalid Date";
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const strHours = String(hours).padStart(2, '0');
      
      return `${day}-${month}-${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return "Invalid Date";
    }
  };

  const renewDateStr = subStatus?.expiryDate;
  // If we don't have a specific creation date in the subscription API, 
  // try to use tenant created_at, or fallback to exactly 1 month before renew date
  let creationDateStr = (tenant as any).created_at;
  if (!creationDateStr && renewDateStr) {
    const renew = new Date(renewDateStr);
    renew.setMonth(renew.getMonth() - 1);
    creationDateStr = renew.toISOString();
  }

  const handleRenewNow = () => {
    const creation = formatDate(creationDateStr);
    const renew = formatDate(renewDateStr);
    
    const text = `Hi Admin,
I would like to renew my game link. Here are my details:

*Host name:* ${baseDomain}
*Creation date:* ${creation}
*Renew date:* ${renew}

Please send me the renewal link.`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/919606914772?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-[#0b00c4] text-center">
        <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase">
          LINK INFO
        </h2>
      </div>

      {/* Table Container */}
      <div className="bg-[#0b00c4] px-2 pb-2">
        {/* Table Headers */}
        <div className="flex border-b border-black h-10 bg-black">
          <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-white text-sm">
            Data type
          </div>
          <div className="flex-1 flex items-center px-3 font-bold text-white text-sm">
            Data value
          </div>
        </div>

        {/* Table Rows */}
        <div className="bg-white">
          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Host name
            </div>
            <div className="flex-1 flex items-center px-3 font-bold text-gray-500 text-[13px] sm:text-sm md:text-base py-2 truncate">
              {baseDomain}
            </div>
          </div>

          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Creation date
            </div>
            <div className="flex-1 flex items-center px-3 font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              {loading ? "Loading..." : formatDate(creationDateStr)}
            </div>
          </div>

          <div className="flex border-b border-black">
            <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              Renew date
            </div>
            <div className="flex-1 flex items-center px-3 font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
              {loading ? "Loading..." : formatDate(renewDateStr)}
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex bg-[#0b00c4] pt-2 h-14">
          <div className="flex-1"></div>
          <div className="flex-1 flex">
            <button 
              onClick={handleRenewNow}
              className="w-full bg-[#ff0000] hover:bg-red-700 text-white font-black uppercase text-sm md:text-base tracking-wide flex items-center justify-center transition-colors"
            >
              RENEW NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
