"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type PrizeGroup = {
  dividend_name: string;
  ticket_numbers: number[];
};

type WinnerHistory = {
  id: string;
  scheduled_at: string;
  completed_at: string;
  winnerCount: number;
  prize_groups: PrizeGroup[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
};

export function WinnerHistoryModal({ isOpen, onClose, tenantId }: Props) {
  const [games, setGames] = useState<WinnerHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col border border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-amber-500"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"></path><path d="M11 12 5.12 2.2"></path><path d="m13 12 5.88-9.8"></path><path d="M8 7h8"></path><circle cx="12" cy="17" r="5"></circle><path d="M12 18v-2h-.5"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-white">Winner History</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No completed games yet.
            </div>
          ) : (
            <div className="space-y-4">
              {games.map(game => {
                const isExpanded = expandedGameId === game.id;
                const dateToUse = new Date(game.completed_at);
                  
                return (
                  <div key={game.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    {/* Game Row Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition select-none"
                      onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                    >
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {dateToUse.toLocaleDateString()}
                          </span>
                          <span className="text-sm text-slate-400">{dateToUse.toLocaleTimeString()}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-400">Total Winners</span>
                          <span className="text-amber-400 font-medium">{game.winnerCount}</span>
                        </div>
                      </div>
                      
                      <div className="text-slate-400">
                        {isExpanded ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m18 15-6-6-6 6"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m6 9 6 6 6-6"></path></svg>}
                      </div>
                    </div>

                    {/* Expanded Winners List */}
                    {isExpanded && (
                      <div className="p-6 border-t border-slate-700 bg-slate-900">
                        {game.prize_groups.length === 0 ? (
                          <div className="text-center text-slate-400">
                            No winners were declared for this game.
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {game.prize_groups.map((group, idx) => (
                              <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-800">
                                <h4 className="text-amber-400 font-semibold mb-3 border-b border-slate-700 pb-2">
                                  {group.dividend_name}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {group.ticket_numbers.map((ticketNo, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-700 text-white rounded-md text-sm font-medium border border-slate-600">
                                      Ticket #{ticketNo}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
