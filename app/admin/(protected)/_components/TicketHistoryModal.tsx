"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

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
  total_tickets: number;
  ticket_price: number;
  booked_count: number;
  tickets: Ticket[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
};

export function TicketHistoryModal({ isOpen, onClose, tenantId }: Props) {
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col border border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-indigo-500"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-white">Ticket History</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No games have been played yet.
            </div>
          ) : (
            <div className="space-y-4">
              {games.map(game => {
                const isExpanded = expandedGameId === game.id;
                const dateToUse = game.status === 'completed' && game.completed_at 
                  ? new Date(game.completed_at) 
                  : new Date(game.scheduled_at);
                  
                return (
                  <div key={game.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    {/* Game Row Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition select-none"
                      onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {dateToUse.toLocaleDateString()}
                          </span>
                          <span className="text-sm text-slate-400">{dateToUse.toLocaleTimeString()}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-400">Tickets Booked</span>
                          <span className="text-white font-medium">{game.booked_count} / {game.total_tickets}</span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-400">Revenue</span>
                          <span className="text-emerald-400 font-medium">₹{(game.booked_count * game.ticket_price).toLocaleString()}</span>
                        </div>

                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                            game.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                            game.status === 'running' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {game.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-slate-400">
                        {isExpanded ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m18 15-6-6-6 6"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m6 9 6 6 6-6"></path></svg>}
                      </div>
                    </div>

                    {/* Expanded Tickets Table */}
                    {isExpanded && (
                      <div className="p-0 border-t border-slate-700 bg-slate-900">
                        {game.tickets.length === 0 ? (
                          <div className="p-6 text-center text-slate-400">
                            No tickets were booked for this game.
                          </div>
                        ) : (
                          <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                              <tr>
                                <th className="px-6 py-3 font-semibold">Ticket #</th>
                                <th className="px-6 py-3 font-semibold">Player</th>
                                <th className="px-6 py-3 font-semibold">Phone</th>
                                <th className="px-6 py-3 font-semibold">Booked By</th>
                                <th className="px-6 py-3 font-semibold">Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {game.tickets.map(t => (
                                <tr key={t.ticket_number} className="hover:bg-slate-800/30 transition">
                                  <td className="px-6 py-3 font-medium text-white">#{t.ticket_number}</td>
                                  <td className="px-6 py-3">{t.player_name || "-"}</td>
                                  <td className="px-6 py-3">{t.player_phone || "-"}</td>
                                  <td className="px-6 py-3 text-slate-400">
                                    {t.booked_via === 'admin' ? "Admin" : 
                                     t.agent_name ? `Agent — ${t.agent_name}` : "Unknown"}
                                  </td>
                                  <td className="px-6 py-3 font-medium text-emerald-400">₹{game.ticket_price}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
