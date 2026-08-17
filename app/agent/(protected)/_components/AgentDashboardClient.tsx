"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { cn } from "@/lib/cn";
import type { AgentTicket, Game, Ticket } from "@/types";

interface AgentDashboardClientProps {
  tenantId: string;
  host: string;
  agentInfo: { id: string; name: string; status: string; commissionPerTicket: number } | null;
  perfData: { total_tickets_sold?: number; agent_earnings?: number };
  initialTickets: AgentTicket[];
  availableGames: Game[];
  initialGameTickets: Ticket[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function AgentDashboardClient({ 
  tenantId, 
  host,
  agentInfo,
  perfData,
  initialTickets, 
  availableGames,
  initialGameTickets 
}: AgentDashboardClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();

  const [activeTab, setActiveTab] = useState<"booking" | "my_tickets">("booking");
  
  // Game & Tickets state
  const [selectedGameId, setSelectedGameId] = useState(availableGames[0]?.id || "");
  const [gameTickets, setGameTickets] = useState<Ticket[]>(initialGameTickets);
  const [myBookedTickets, setMyBookedTickets] = useState<AgentTicket[]>(initialTickets);

  // Sync state if props change (Next.js refresh)
  useEffect(() => {
    setMyBookedTickets(initialTickets);
    setGameTickets(initialGameTickets);
  }, [initialTickets, initialGameTickets]);

  const activeGame = availableGames.find(g => g.id === selectedGameId);

  // --- Filter & Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'available' | 'booked'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const ticketsPerPage = 21; // 3 columns * 7 rows

  // --- Single Booking State ---
  const [bookingTicket, setBookingTicket] = useState<Ticket | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");

  // --- Logic for Filter and Search ---
  const filteredTickets = gameTickets.filter(t => {
    // 1. Tab Status Filter
    if (filter !== 'all' && t.status !== filter) return false;
    
    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchNumber = t.ticket_number.toString() === query;
      const matchName = t.player_name?.toLowerCase().includes(query);
      const matchPhone = t.player_phone?.toLowerCase().includes(query);
      
      if (!matchNumber && !matchName && !matchPhone) return false;
    }
    
    return true;
  });

  // --- Logic for Pagination ---
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage) || 1;
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const currentTickets = filteredTickets.slice(startIndex, startIndex + ticketsPerPage);

  const handleBookTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingTicket) return;

    showLoader(`Booking Ticket #${bookingTicket.ticket_number}...`);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const payload = {
        playerName,
        playerPhone,
      };

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/games/${selectedGameId}/tickets/${bookingTicket.id}/book-direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to book ticket";
        try {
          const body = await res.json();
          msg = body.message || msg;
        } catch (err) {}
        throw new Error(msg);
      }
      
      showToast(`Ticket #${bookingTicket.ticket_number} successfully booked for ${playerName}!`, "success");
      
      setBookingTicket(null);
      setPlayerName("");
      setPlayerPhone("");
      
      showLoader("Refreshing Dashboard...");
      router.refresh();
      setTimeout(() => hideLoader(), 500);
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("not available") || msg.includes("conflict")) {
        showToast("Ticket is already booked by someone else.", "error");
      } else {
        showToast(err.message || "Booking failed", "error");
      }
      
      setBookingTicket(null);
      setPlayerName("");
      setPlayerPhone("");
      
      // If there's a conflict (e.g. ticket already taken), instantly refresh to sync with DB
      router.refresh();
      hideLoader();
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Agent Dashboard</h1>
          <p className="text-slate-400 mt-1 font-medium">Manage bookings and track your performance</p>
        </div>
      </div>

      {/* Info Cards (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Game Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Website Info</h2>
          </div>
          <p className="text-lg font-black text-slate-50">{host}</p>
          <p className="mt-1 text-sm text-slate-400 font-medium">Domain currently active</p>
        </div>

        {/* Business Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Business Info</h2>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-slate-400 font-medium mb-1">Total Booked</p>
              <p className="text-2xl font-black text-white">{perfData.total_tickets_sold || 0}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 font-medium mb-1">Total Profit</p>
              <p className="text-2xl font-black text-emerald-400">₹{(perfData.agent_earnings || 0).toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* Agent Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Agent Info</h2>
          </div>
          <p className="text-lg font-black text-slate-50">{agentInfo?.name || "—"}</p>
          <p className="mt-1 text-sm text-slate-400 font-medium">Phone: <span className="text-white">{agentInfo ? (agentInfo as any).phone || "—" : "—"}</span></p>
          <p className="mt-1 text-sm text-slate-400 font-medium">Commission: <span className="text-white">₹{agentInfo?.commissionPerTicket ?? 0}/ticket</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button 
          onClick={() => setActiveTab("booking")}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-t-xl transition-colors",
            activeTab === "booking" 
              ? "bg-slate-800 text-white border-t border-x border-slate-700" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          )}
        >
          Booking Dashboard
        </button>
        <button 
          onClick={() => setActiveTab("my_tickets")}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-t-xl transition-colors flex items-center gap-2",
            activeTab === "my_tickets" 
              ? "bg-slate-800 text-white border-t border-x border-slate-700" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          )}
        >
          My Tickets
          <span className="bg-cyan-500/20 text-cyan-400 py-0.5 px-2 rounded-full text-xs">{myBookedTickets.length}</span>
        </button>
      </div>

      {/* Booking Dashboard Tab */}
      {activeTab === "booking" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Available Tickets</h2>
              <p className="text-sm text-slate-400">View and manually book tickets for the current game</p>
            </div>
            
            <div className="flex bg-slate-800/80 p-1.5 rounded-lg border border-slate-700 shadow-inner">
              <button 
                onClick={() => { setFilter('all'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'all' ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({gameTickets.length})
              </button>
              <button 
                onClick={() => { setFilter('available'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'available' ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500' : 'text-emerald-500/80 hover:text-emerald-400'}`}
              >
                Available ({gameTickets.filter(t => t.status === 'available').length})
              </button>
              <button 
                onClick={() => { setFilter('booked'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'booked' ? 'bg-violet-600 text-white shadow-sm ring-1 ring-violet-500' : 'text-violet-400/80 hover:text-violet-300'}`}
              >
                Booked ({gameTickets.filter(t => t.status === 'booked').length})
              </button>
            </div>
          </div>

          <div className="mb-6 relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by ticket number, player name, or phone number..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
            />
            <svg className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {currentTickets.map((ticket) => (
              <div key={ticket.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col">
                {/* Ticket Header */}
                <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="font-black text-white text-lg">#{ticket.ticket_number}</span>
                  {ticket.status === 'available' && (
                    <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-500/20">Available</span>
                  )}
                  {ticket.status === 'reserved' && (
                    <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-500/20">Reserved</span>
                  )}
                  {ticket.status === 'booked' && (
                    <span className="bg-violet-500/10 text-violet-400 text-xs font-bold px-2.5 py-1 rounded-md border border-violet-500/20">Booked</span>
                  )}
                </div>

                {/* Tambola Grid */}
                <div className="p-4 bg-slate-900/50 flex-grow flex items-center justify-center">
                  <div className="grid grid-cols-9 gap-1 w-full max-w-[320px]">
                    {ticket.grid.map((row, rIdx) => 
                      row.map((cell, cIdx) => (
                        <div 
                          key={`${rIdx}-${cIdx}`} 
                          className={`aspect-square flex items-center justify-center text-sm md:text-base font-bold rounded-sm border ${
                            cell === 0 
                              ? 'bg-slate-800/40 border-slate-700/50 text-transparent' 
                              : 'bg-slate-200 border-slate-300 text-slate-900 shadow-sm'
                          }`}
                        >
                          {cell !== 0 ? cell : ''}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ticket Footer / Action */}
                <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/30">
                  {ticket.status === 'available' ? (
                    <button
                      onClick={() => setBookingTicket(ticket)}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-sm transition shadow-sm"
                    >
                      Book Ticket
                    </button>
                  ) : ticket.status === 'booked' ? (
                    <div className="text-xs text-center py-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold text-slate-200 text-sm">{ticket.player_name || 'Unknown'}</span>
                        {ticket.player_phone && <span className="text-slate-400">({ticket.player_phone})</span>}
                      </div>
                      {(ticket as any).booked_via && (
                        <div className="text-[10px] uppercase text-violet-400 font-bold tracking-wider mt-0.5">
                          {(ticket as any).booked_via === 'admin' 
                            ? 'Admin' 
                            : (ticket as any).agents?.name 
                              ? `${(ticket as any).agents.name} (Agent)` 
                              : 'Agent'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-500/80 text-center py-1 font-semibold">
                      Payment Pending / Reserved
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredTickets.length > 0 ? (
            totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
                <p className="text-sm text-slate-400">
                  Showing <span className="font-bold text-white">{startIndex + 1}</span> to <span className="font-bold text-white">{Math.min(startIndex + ticketsPerPage, filteredTickets.length)}</span> of <span className="font-bold text-white">{filteredTickets.length}</span> tickets
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-sm font-semibold text-white transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-sm font-semibold text-white transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <p className="text-slate-400 font-medium">No tickets found for the selected filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Booking Modal Overlay */}
      {bookingTicket && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="border-b border-slate-800 p-4 flex items-center justify-between">
              <h3 className="font-bold text-white">Book Ticket #{bookingTicket.ticket_number}</h3>
              <button onClick={() => setBookingTicket(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleBookTicket} className="p-5">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Player Name</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="e.g. Rahul"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Player Phone</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    maxLength={10}
                    title="Please enter exactly 10 digits"
                    value={playerPhone}
                    onChange={(e) => setPlayerPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* My Tickets Tab */}
      {activeTab === "my_tickets" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200">Recently Booked by You</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ticket #</th>
                  <th className="px-6 py-4 font-semibold">Player</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Booked On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {myBookedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      You haven't booked any tickets yet.
                    </td>
                  </tr>
                ) : (
                  myBookedTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                          #{t.ticket_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">{t.player_name}</td>
                      <td className="px-6 py-4">{t.player_phone}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(t.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
