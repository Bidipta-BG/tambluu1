"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type Winner = {
  id: string;
  prize_name: string;
  prize_amount: number;
  ticket_number: number;
  player_name?: string | null;
  player_phone?: string | null;
  booked_via?: string | null;
  agent_name?: string | null;
  declared_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
};

export function ShowCurrentWinnersModal({ isOpen, onClose, tenantId }: Props) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/current-winners`, { headers })
        .then((data: any) => {
          if (!data || !data.game) {
            setGame(null);
            setWinners([]);
          } else {
            setGame(data.game);
            setWinners(data.winners || []);
          }
        })
        .catch(err => {
          console.error(err);
          setError("Failed to load current winners.");
        })
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
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-yellow-500"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Current Winners</h2>
              {game && (
                <p className="text-sm text-slate-400">
                  Last Completed Game: {new Date(game.completed_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-red-400 gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <p>{error}</p>
            </div>
          ) : !game ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-lg font-medium text-slate-300">No completed games yet.</p>
              <p className="text-sm mt-1">Winners will appear here after the first game ends.</p>
            </div>
          ) : winners.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-800/30 rounded-lg border border-slate-800">
              No winners were declared in this game.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800 text-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Prize Won</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Ticket #</th>
                    <th className="px-4 py-3 font-semibold">Player</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Booked By</th>
                    <th className="px-4 py-3 font-semibold">Time Won</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {winners.map(w => (
                    <tr key={w.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-medium text-yellow-400">{w.prize_name}</td>
                      <td className="px-4 py-3 text-emerald-400 font-medium">₹{w.prize_amount}</td>
                      <td className="px-4 py-3 font-bold text-white">#{w.ticket_number}</td>
                      <td className="px-4 py-3">{w.player_name || "-"}</td>
                      <td className="px-4 py-3">{w.player_phone || "-"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {w.booked_via === 'admin' ? "Admin" : 
                         w.agent_name ? `Agent — ${w.agent_name}` : "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(w.declared_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
