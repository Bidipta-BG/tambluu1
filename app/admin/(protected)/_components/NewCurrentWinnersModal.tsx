"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";

type Winner = {
  id: string;
  prize_name: string;
  ticket_number: number;
  player_name?: string | null;
  player_phone?: string | null;
  booked_via?: string | null;
  agent_name?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
};

export function NewCurrentWinnersModal({ isOpen, onClose, tenantId }: Props) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/current-winners`, { headers })
        .then((data: any) => {
          if (data && data.winners) {
            setWinners(data.winners);
          } else {
            setWinners([]);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [isOpen, tenantId]);

  const handleDownload = () => {
    if (winners.length === 0) return alert("No winners to download!");

    const headers = ["TNO", "PRIZE", "NAME", "PHONE", "BOOKER", "WHATSAPP BOOKER"];
    const rows = winners.map(w => {
      const booker = w.booked_via === 'admin' ? 'admin' : (w.agent_name || 'agent');
      return [
        w.ticket_number,
        `"${w.prize_name}"`,
        `"${w.player_name || "-"}"`,
        `"${w.player_phone || "-"}"`,
        `"${booker}"`,
        "whatsapp"
      ].join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `current_winners_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-[#0b00c4] w-full max-w-3xl rounded-md overflow-hidden shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col relative border-2 border-blue-600">
        
        {/* Header */}
        <div className="flex justify-center items-center p-3 relative bg-[#0b00c4]">
          <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-wide">
            CURRENT WINNER LIST
          </h3>
          <button 
            onClick={onClose}
            className="absolute right-2 top-2 bg-[#ff522b] hover:bg-red-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>
        
        {/* Download Button */}
        <div className="bg-[#0b00c4] px-4 pb-2 flex justify-end">
          <button 
            onClick={handleDownload}
            disabled={loading || winners.length === 0}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs sm:text-sm px-4 py-1 rounded shadow-md disabled:opacity-50"
          >
            DOWNLOAD LIST
          </button>
        </div>

        {/* Body / Table */}
        <div className="flex-1 overflow-y-auto bg-white mx-1 mb-1 sm:mx-2 sm:mb-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <span className="text-black font-bold flex items-center gap-2">
                <Spinner /> Loading winners...
              </span>
            </div>
          ) : (
            <table className="w-full text-center border-collapse">
              <thead className="bg-black sticky top-0 z-10">
                <tr>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">TNO</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">PRIZE</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">NAME</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">PHONE</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">BOOKER</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 leading-tight">WHATSAPP<br/>BOOKER</th>
                </tr>
              </thead>
              <tbody>
                {winners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-black font-bold">No winners yet.</td>
                  </tr>
                ) : (
                  winners.map((w, i) => (
                    <tr key={w.id} className="border-b border-gray-300">
                      <td className="p-1 sm:p-2 text-black font-semibold text-xs sm:text-sm border-r border-gray-300">
                        {w.ticket_number}
                      </td>
                      <td className="p-1 sm:p-2 text-red-600 font-bold text-xs sm:text-sm border-r border-gray-300 whitespace-nowrap">
                        {w.prize_name}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-[10px] sm:text-sm border-r border-gray-300 max-w-[80px] sm:max-w-[120px] truncate">
                        {w.player_name || "-"}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-xs sm:text-sm border-r border-gray-300">
                        {w.player_phone || "-"}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-xs sm:text-sm border-r border-gray-300">
                        {w.booked_via === 'admin' ? "admin" : (w.agent_name || "agent")}
                      </td>
                      <td className="p-1 sm:p-2">
                        <div className="bg-[#008000] text-white font-bold text-[10px] sm:text-xs py-1 px-2 mx-auto inline-block">
                          whatsapp
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
      </div>
    </div>
  );
}
