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

export function BusinessHistoryModal({ isOpen, onClose, tenantId }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<Record<string, BusinessSummary>>({});
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    
    setLoadingList(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games`, { headers })
        .then((data: any) => {
          setGames(data || []);
        })
        .catch(console.error)
        .finally(() => setLoadingList(false));
    });
  }, [isOpen, tenantId]);

  const toggleExpand = (gameId: string) => {
    if (expandedGameId === gameId) {
      setExpandedGameId(null);
      return;
    }
    
    setExpandedGameId(gameId);
    
    if (!summaryData[gameId]) {
      setLoadingSummary(prev => ({ ...prev, [gameId]: true }));
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
        api.get(`/tenants/${tenantId}/games/${gameId}/business-summary`, { headers })
          .then((data: any) => {
            setSummaryData(prev => ({ ...prev, [gameId]: data }));
          })
          .catch(console.error)
          .finally(() => {
            setLoadingSummary(prev => ({ ...prev, [gameId]: false }));
          });
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col border border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-emerald-500"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
            </div>
            <h2 className="text-xl font-bold text-white">Business History</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
          {loadingList ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No games found.
            </div>
          ) : (
            <div className="space-y-4">
              {games.map(game => {
                const isExpanded = expandedGameId === game.id;
                const isLoading = loadingSummary[game.id];
                const summary = summaryData[game.id];
                const dateToUse = game.status === 'completed' && game.completed_at 
                  ? new Date(game.completed_at) 
                  : new Date(game.scheduled_at);
                  
                return (
                  <div key={game.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    {/* Game Row Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition select-none"
                      onClick={() => toggleExpand(game.id)}
                    >
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {dateToUse.toLocaleDateString()}
                          </span>
                          <span className="text-sm text-slate-400">{dateToUse.toLocaleTimeString()}</span>
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

                    {/* Expanded Summary Table */}
                    {isExpanded && (
                      <div className="p-0 border-t border-slate-700 bg-slate-900">
                        {isLoading ? (
                          <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                          </div>
                        ) : summary ? (
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                              {/* Left Column - Counts */}
                              <div className="space-y-2">
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Total Tickets</span>
                                  <span className="text-white font-medium">{summary.total_tickets}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Sold Tickets</span>
                                  <span className="text-white font-medium">{summary.sold_tickets}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Total Half Sheet Booked</span>
                                  <span className="text-white font-medium">{summary.half_sheets_booked}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Total Full Sheet Booked</span>
                                  <span className="text-white font-medium">{summary.full_sheets_booked}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Tickets Left</span>
                                  <span className="text-white font-medium">{summary.tickets_left}</span>
                                </div>
                              </div>
                              
                              {/* Right Column - Financials */}
                              <div className="space-y-2">
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Price of Ticket</span>
                                  <span className="text-white font-medium">₹{summary.ticket_price}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Commission to Agent</span>
                                  <span className="text-white font-medium">₹{summary.commission_per_ticket} per ticket</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Total Revenue</span>
                                  <span className="text-white font-medium">₹{summary.total_revenue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Total Prize Money</span>
                                  <span className="text-red-400 font-medium">-₹{summary.total_prize_money.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-800">
                                  <span className="text-slate-400">Total Agent Commission</span>
                                  <span className="text-red-400 font-medium">-₹{summary.total_agent_commission.toLocaleString()}</span>
                                </div>
                                
                                {/* Profit Row */}
                                <div className={`flex justify-between py-3 mt-2 rounded-lg px-3 ${
                                  summary.total_profit >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
                                }`}>
                                  <span className="font-bold text-white uppercase tracking-wider text-sm">Total Profit</span>
                                  <span className={`font-bold text-lg ${summary.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {summary.total_profit >= 0 ? '+' : '-'}₹{Math.abs(summary.total_profit).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-red-400">Failed to load summary.</div>
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
