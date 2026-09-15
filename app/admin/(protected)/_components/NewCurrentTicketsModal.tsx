"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";

type Ticket = {
  id: string;
  ticket_number: number;
  status: string;
  player_name?: string | null;
  player_phone?: string | null;
  booked_via?: string | null;
  agents?: { name: string } | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  gameId: string;
};

export function NewCurrentTicketsModal({ isOpen, onClose, tenantId, gameId }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/${gameId}/admin-tickets`, { headers })
        .then((data: any) => {
          // Sort tickets by ticket_number just in case
          const sorted = (data || []).sort((a: Ticket, b: Ticket) => a.ticket_number - b.ticket_number);
          setTickets(sorted);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [isOpen, tenantId, gameId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-[#0b00c4] w-full max-w-2xl rounded-md overflow-hidden shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col relative border-2 border-blue-600">
        
        {/* Header */}
        <div className="flex justify-center items-center p-3 relative bg-[#0b00c4]">
          <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-wide">
            LAST CURRENT TICKET
          </h3>
          <button 
            onClick={onClose}
            className="absolute right-2 top-2 bg-[#ff522b] hover:bg-red-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>
        
        {/* Body / Table */}
        <div className="flex-1 overflow-y-auto bg-white mx-1 mb-1 sm:mx-2 sm:mb-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <span className="text-black font-bold flex items-center gap-2">
                <Spinner /> Loading tickets...
              </span>
            </div>
          ) : (
            <table className="w-full text-center border-collapse">
              <thead className="bg-black sticky top-0 z-10">
                <tr>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">TNO</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">NAME</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">PHONE</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 border-r border-gray-600">BOOKER</th>
                  <th className="text-[#ffffcc] font-bold text-[10px] sm:text-xs p-2 leading-tight">WHATSAPP<br/>BOOKER</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-black font-bold">No tickets found.</td>
                  </tr>
                ) : (
                  tickets.map((t, i) => (
                    <tr key={t.id} className="border-b border-gray-300">
                      <td className="p-1 sm:p-2 text-black font-semibold text-xs sm:text-sm border-r border-gray-300">
                        {t.ticket_number}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-[10px] sm:text-sm border-r border-gray-300 max-w-[80px] sm:max-w-[120px] truncate">
                        {t.player_name || "-"}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-xs sm:text-sm border-r border-gray-300">
                        {t.player_phone || "-"}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-xs sm:text-sm border-r border-gray-300">
                        {t.status === 'available' ? "" : 
                         t.booked_via === 'admin' ? "admin" : 
                         t.agents?.name ? t.agents.name : "agent"}
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
