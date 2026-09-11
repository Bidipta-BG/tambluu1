"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

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

export function ShowCurrentTicketsModal({ isOpen, onClose, tenantId, gameId }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "booked" | "available">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/${gameId}/admin-tickets`, { headers })
        .then((data: any) => {
          setTickets(data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [isOpen, tenantId, gameId]);

  if (!isOpen) return null;

  const filteredTickets = tickets.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.ticket_number.toString().includes(q) ||
        (t.player_name || "").toLowerCase().includes(q) ||
        (t.player_phone || "").includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col border border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Current Game Tickets</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-4 justify-between bg-slate-900/50">
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("booked")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filter === "booked" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Booked
            </button>
            <button
              onClick={() => setFilter("available")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filter === "available" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Available
            </button>
          </div>

          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search name, phone, ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No tickets found for this game.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800 text-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ticket #</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Player</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Booked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {filteredTickets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-medium text-white">#{t.ticket_number}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'booked' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{t.player_name || "-"}</td>
                      <td className="px-4 py-3">{t.player_phone || "-"}</td>
                      <td className="px-4 py-3">
                        {t.status === 'available' ? "-" : 
                         t.booked_via === 'admin' ? "Admin" : 
                         t.agents?.name ? `Agent — ${t.agents.name}` : "Unknown"}
                      </td>
                    </tr>
                  ))}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No tickets match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
