"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";

type PrizeGroup = {
  dividend_name: string;
  ticket_numbers: number[];
};

type WinnerHistory = {
  id: string;
  scheduled_at: string;
  completed_at?: string;
  winnerCount: number;
  prize_groups: PrizeGroup[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
};

export function NewWinnerHistoryModal({ isOpen, onClose, tenantId }: Props) {
  const [games, setGames] = useState<WinnerHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<WinnerHistory | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedGame(null);
      return;
    }
    
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/winner-history`, { headers })
        .then((data: any) => {
          setGames(data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [isOpen, tenantId]);

  // Flatten the prize groups into individual rows
  const getFlattenedRows = (game: WinnerHistory) => {
    const rows: { dividend: string, ticket: number }[] = [];
    if (game.prize_groups) {
      game.prize_groups.forEach(pg => {
        if (pg.ticket_numbers) {
          pg.ticket_numbers.forEach(tno => {
            rows.push({ dividend: pg.dividend_name, ticket: tno });
          });
        }
      });
    }
    return rows;
  };

  const handleDownload = () => {
    if (!selectedGame) return;
    const rows = getFlattenedRows(selectedGame);
    if (rows.length === 0) return alert("No winners to download!");

    const headers = ["Divident", "Ticket No."];
    const csvRows = rows.map(r => {
      return [`"${r.dividend}"`, r.ticket].join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `winner_history_${selectedGame.id}_${new Date().toISOString().slice(0,10)}.csv`);
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
                Winners Info
              </h3>
              <h4 className="text-white font-bold text-sm sm:text-base">
                ({formatDateLine1(selectedGame.completed_at || selectedGame.scheduled_at)} {formatDateLine2(selectedGame.completed_at || selectedGame.scheduled_at)})
              </h4>
            </div>
          ) : (
            <h3 className="text-white font-black text-lg sm:text-xl tracking-wide">
              Select Winners By Date
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
              <span className={selectedGame ? "text-black font-bold flex items-center gap-2" : "text-white font-bold flex items-center gap-2"}>
                <Spinner /> Loading history...
              </span>
            </div>
          ) : !selectedGame ? (
            // Date Grid View
            <div className="w-full">
              {games.length === 0 ? (
                <div className="p-4 text-white text-center font-bold">No winner history available.</div>
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
            // Winners Info View
            <div className="flex-1 flex flex-col relative pb-16">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-black sticky top-0 z-10">
                    <tr>
                      <th className="text-[#ffffcc] font-bold text-sm sm:text-base p-2 border-r border-gray-600">Divident</th>
                      <th className="text-[#ffffcc] font-bold text-sm sm:text-base p-2">Ticket No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = getFlattenedRows(selectedGame);
                      if (rows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={2} className="p-4 text-black font-bold">No winners found for this game.</td>
                          </tr>
                        );
                      }
                      return rows.map((r, i) => (
                        <tr key={i} className="border-b border-gray-300">
                          <td className="p-1 sm:p-2 text-black font-semibold text-sm sm:text-base border-r border-gray-300">
                            {r.dividend}
                          </td>
                          <td className="p-1 sm:p-2 text-black font-semibold text-sm sm:text-base border-r border-gray-300">
                            {r.ticket}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Download Button Centered at Bottom of Table view area */}
              <div className="absolute bottom-0 left-0 right-0 bg-blue-700 py-3 flex justify-center border-t-2 border-blue-800">
                <button 
                  onClick={handleDownload}
                  className="bg-[#ff0000] hover:bg-red-700 text-white font-black text-sm sm:text-base px-6 py-2 rounded-md shadow-md"
                >
                  DOWNLOAD
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
