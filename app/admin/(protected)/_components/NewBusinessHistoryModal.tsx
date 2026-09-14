"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type Game = {
  id: string;
  status: string;
  scheduled_at: string;
  completed_at?: string;
};

type BusinessSummary = {
  total_tickets: number;
  sold_tickets: number;
  half_sheets_booked: number;
  full_sheets_booked: number;
  tickets_left: number;
  ticket_price: number;
  commission_per_ticket: number;
  total_revenue: number;
  total_prize_money: number;
  total_agent_commission: number;
  total_profit: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
};

export function NewBusinessHistoryModal({ isOpen, onClose, tenantId }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedGame(null);
      setSummary(null);
      return;
    }
    
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games`, { headers })
        .then((data: any) => {
          setGames(data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [isOpen, tenantId]);

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setLoadingSummary(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/${game.id}/business-summary`, { headers })
        .then((data: any) => {
          setSummary(data);
        })
        .catch(console.error)
        .finally(() => setLoadingSummary(false));
    });
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

  const renderTableRows = () => {
    if (!summary) return null;
    const rows = [
      { label: "totalTicket", value: summary.total_tickets },
      { label: "soldTicket", value: summary.sold_tickets },
      { label: "totalHaftsheetBookedTkt", value: summary.half_sheets_booked },
      { label: "totalFullsheetBookedTkt", value: summary.full_sheets_booked },
      { label: "ticketLeft", value: summary.tickets_left },
      { label: "ticketPrice", value: summary.ticket_price },
      { label: "agentCommission", value: summary.commission_per_ticket },
      { label: "totalRevenue", value: summary.total_revenue },
      { label: "totalPrizeMoney", value: summary.total_prize_money },
      { label: "totalProfit", value: summary.total_profit },
    ];

    return rows.map((row, i) => (
      <tr key={i} className="border-b border-gray-300">
        <td className="p-2 sm:p-3 text-black font-semibold text-sm sm:text-base border-r border-gray-300">
          {row.label}
        </td>
        <td className="p-2 sm:p-3 text-black font-semibold text-sm sm:text-base">
          {row.value}
        </td>
      </tr>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-[#0b00c4] w-full max-w-lg rounded-md overflow-hidden shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col relative border-2 border-blue-600">
        
        {/* Header */}
        <div className="flex justify-center items-center p-3 relative bg-[#0b00c4]">
          {selectedGame ? (
            <div className="text-center">
              <h3 className="text-white font-black text-lg sm:text-xl tracking-wide">
                Business Info
              </h3>
              <h4 className="text-white font-bold text-sm sm:text-base">
                ({formatDateLine1(selectedGame.completed_at || selectedGame.scheduled_at)} {formatDateLine2(selectedGame.completed_at || selectedGame.scheduled_at)})
              </h4>
            </div>
          ) : (
            <h3 className="text-white font-black text-lg sm:text-xl tracking-wide">
              Select Business By Date
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
        
        {/* Body */}
        <div className={`flex-1 overflow-y-auto flex flex-col ${selectedGame ? 'bg-white mx-1 mb-1 sm:mx-2 sm:mb-2' : 'bg-[#0b00c4] p-2 sm:p-4'}`}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <span className={selectedGame ? "text-black font-bold" : "text-white font-bold"}>Loading history...</span>
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
                      onClick={() => handleSelectGame(g)}
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
            // Business Info View
            <div className="flex-1 overflow-y-auto">
              {loadingSummary ? (
                <div className="flex justify-center items-center h-full">
                  <span className="text-black font-bold">Loading business info...</span>
                </div>
              ) : (
                <table className="w-full text-center border-collapse">
                  <thead className="bg-black sticky top-0 z-10">
                    <tr>
                      <th className="text-[#ffffcc] font-bold text-sm sm:text-base p-2 border-r border-gray-600">Info</th>
                      <th className="text-[#ffffcc] font-bold text-sm sm:text-base p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTableRows()}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
