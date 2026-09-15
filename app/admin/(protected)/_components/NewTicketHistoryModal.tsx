"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";

type Ticket = {
  ticket_number: number;
  player_name?: string | null;
  player_phone?: string | null;
  booked_via?: string | null;
  agent_name?: string | null;
};

type GameHistory = {
  id: string;
  status: string;
  scheduled_at: string;
  completed_at?: string;
  tickets: Ticket[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
};

export function NewTicketHistoryModal({ isOpen, onClose, tenantId }: Props) {
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameHistory | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedGame(null);
      return;
    }
    
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/ticket-history`, { headers })
        .then((data: any) => {
          setGames(data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [isOpen, tenantId]);

  const handleDownload = () => {
    if (!selectedGame || selectedGame.tickets.length === 0) return alert("No tickets to download!");

    const headers = ["TNO", "NAME", "PHONE", "BOOKER", "MSG BOOKER"];
    const rows = selectedGame.tickets.map(t => {
      const booker = t.booked_via === 'admin' ? 'admin' : (t.agent_name || 'agent');
      return [
        t.ticket_number,
        `"${t.player_name || "-"}"`,
        `"${t.player_phone || "-"}"`,
        `"${booker}"`,
        "whatsapp"
      ].join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ticket_history_${selectedGame.id}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateLine1 = (isoString: string) => {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateLine2 = (isoString: string) => {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-[#0b00c4] w-full max-w-lg rounded-md overflow-hidden shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col relative border-2 border-blue-600">
        
        {/* Header */}
        <div className="flex justify-center items-center p-3 relative bg-[#0b00c4]">
          {selectedGame ? (
            <div className="text-center">
              <h3 className="text-white font-black text-lg sm:text-xl tracking-wide">
                Tickets Info
              </h3>
              <h4 className="text-white font-bold text-sm sm:text-base">
                ({formatDateLine1(selectedGame.completed_at || selectedGame.scheduled_at)} {formatDateLine2(selectedGame.completed_at || selectedGame.scheduled_at)})
              </h4>
            </div>
          ) : (
            <h3 className="text-white font-black text-lg sm:text-xl tracking-wide">
              Select Ticket by Date
            </h3>
          )}

          <button 
            onClick={onClose}
            className="absolute right-2 top-2 bg-[#ff522b] hover:bg-red-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl leading-none"
          >
            &times;
          </button>

          {selectedGame && (
             <button 
               onClick={() => setSelectedGame(null)}
               className="absolute left-2 top-2 bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded font-bold text-xs"
             >
               BACK
             </button>
          )}
        </div>
        
        {selectedGame && (
          <div className="bg-[#0b00c4] px-4 pb-2 flex justify-end">
            <button 
              onClick={handleDownload}
              disabled={selectedGame.tickets.length === 0}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs sm:text-sm px-4 py-1 rounded shadow-md disabled:opacity-50"
            >
              DOWNLOAD LIST
            </button>
          </div>
        )}

        {/* Body */}
        <div className={`flex-1 overflow-y-auto ${selectedGame ? 'bg-white mx-1 mb-1 sm:mx-2 sm:mb-2' : 'bg-[#0b00c4] p-2 sm:p-4'}`}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <span className={selectedGame ? "text-black font-bold flex items-center gap-2" : "text-white font-bold flex items-center gap-2"}>
                <Spinner /> Loading history...
              </span>
            </div>
          ) : !selectedGame ? (
            // Date Grid View
            <div className="w-full">
              {games.length === 0 ? (
                <div className="p-4 text-white text-center font-bold">No game history available.</div>
              ) : (
                <div className="grid grid-cols-3 border-l-2 border-t-2 border-black">
                  {games.map(g => (
                    <div 
                      key={g.id} 
                      onClick={() => setSelectedGame(g)}
                      className="bg-white border-r-2 border-b-2 border-black p-1 sm:p-2 text-center cursor-pointer hover:bg-gray-200 transition-colors flex flex-col justify-center min-h-[60px] sm:min-h-[80px]"
                    >
                      <div className="font-black text-sm sm:text-base text-black whitespace-nowrap mb-0.5">
                        {formatDateLine1(g.completed_at || g.scheduled_at)}
                      </div>
                      <div className="font-black text-sm sm:text-base text-black whitespace-nowrap">
                        {formatDateLine2(g.completed_at || g.scheduled_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Tickets Info View
            <table className="w-full text-center border-collapse">
              <thead className="bg-black sticky top-0 z-10">
                <tr>
                  <th className="text-white font-bold text-xs sm:text-sm p-2 border-r border-gray-600">TNO</th>
                  <th className="text-white font-bold text-xs sm:text-sm p-2 border-r border-gray-600">NAME</th>
                  <th className="text-white font-bold text-xs sm:text-sm p-2 border-r border-gray-600">PHONE</th>
                  <th className="text-white font-bold text-xs sm:text-sm p-2 border-r border-gray-600">BOOKER</th>
                  <th className="text-white font-bold text-xs sm:text-sm p-2 leading-tight">MSG<br/>BOOKER</th>
                </tr>
              </thead>
              <tbody>
                {selectedGame.tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-black font-bold">No tickets found for this game.</td>
                  </tr>
                ) : (
                  selectedGame.tickets.map((t, i) => (
                    <tr key={i} className="border-b border-gray-300">
                      <td className="p-1 sm:p-2 text-black font-semibold text-xs sm:text-sm border-r border-gray-300">
                        {t.ticket_number}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-xs sm:text-sm border-r border-gray-300 max-w-[80px] sm:max-w-[120px] truncate">
                        {t.player_name || "-"}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-xs sm:text-sm border-r border-gray-300">
                        {t.player_phone || "-"}
                      </td>
                      <td className="p-1 sm:p-2 text-black text-xs sm:text-sm border-r border-gray-300">
                        {t.booked_via === 'admin' ? "admin" : (t.agent_name || "agent")}
                      </td>
                      <td className="p-1 sm:p-2">
                        <div className="bg-[#008000] text-white font-bold text-xs sm:text-sm py-1 px-2 mx-auto inline-block">
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
