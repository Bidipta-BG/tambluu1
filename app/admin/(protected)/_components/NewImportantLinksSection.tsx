"use client";

import React, { useState } from "react";
import type { Tenant } from "@/types";

interface Props {
  tenant: Tenant;
}

export function NewImportantLinksSection({ tenant }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fallback to window location if tenant domain is somehow empty during dev
  const baseDomain = tenant.domain || (typeof window !== "undefined" ? window.location.host : "meghaonlinetambola.com");
  
  const links = [
    { url: `https://${baseDomain}` },
    { url: `https://${baseDomain}/admin` },
    { url: `https://${baseDomain}/agent` },
  ];

  const handleCopy = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tenant.businessName || 'Tambola'}`,
          url: url
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      alert("Sharing is not supported on this browser. Please use the Copy Link button instead.");
    }
  };

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl p-4 sm:p-6">
      <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase text-center mb-6">
        IMPORTANT LINKS
      </h2>

      <div className="space-y-2 sm:space-y-4">
        {links.map((item, i) => (
          <div key={i} className="flex flex-row gap-1 sm:gap-2 h-12 sm:h-14">
            <div className="flex-1 min-w-0 bg-white flex items-center px-2 sm:px-3 overflow-hidden">
              <span className="text-black font-medium text-[10px] sm:text-sm md:text-base truncate">
                {item.url.replace(/^https?:\/\//, '')}
              </span>
            </div>
            
            <div className="flex gap-1 sm:gap-2 h-full shrink-0">
              <button 
                onClick={() => handleCopy(item.url, i)}
                className="bg-[#ff0000] hover:bg-red-700 text-white font-black uppercase text-[10px] sm:text-xs md:text-sm px-2 sm:px-4 md:px-6 transition-colors whitespace-nowrap min-w-[70px] sm:min-w-[100px]"
              >
                {copiedIndex === i ? "COPIED!" : "COPY LINK"}
              </button>
              
              <button 
                onClick={() => handleShare(item.url)}
                className="bg-[#008000] hover:bg-green-700 text-white font-black uppercase text-[10px] sm:text-xs md:text-sm px-2 sm:px-4 md:px-6 transition-colors whitespace-nowrap flex text-center items-center justify-center min-w-[70px] sm:min-w-[100px] leading-tight"
              >
                SHARE<br/>LINK
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
