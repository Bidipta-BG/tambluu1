"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Game, Ticket } from "@/types";

interface AllTicketsSectionProps {
  tenantId: string;
  game: Game | null;
  tickets: Ticket[];
}

export default function AllTicketsSection({ tenantId, game, tickets }: AllTicketsSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'available' | 'booked'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const ticketsPerPage = 21; // 3 columns * 7 rows
  
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");

  if (!game || game.booking_status !== "open") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm opacity-50 pointer-events-none">
        <h2 className="text-lg font-bold text-white mb-2">All Tickets</h2>
        <p className="text-sm text-slate-400">Dashboard is locked. Activate a game to view and manage tickets.</p>
      </div>
    );
  }

  // Filter logic
  const filteredTickets = tickets.filter(t => {
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

  // Pagination logic
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage) || 1;
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const currentTickets = filteredTickets.slice(startIndex, startIndex + ticketsPerPage);

  const handleBookTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTickets.length === 0) return;

    showLoader(`Booking ${selectedTickets.length} Ticket(s)...`);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };
      
      const results = await Promise.allSettled(
        selectedTickets.map(ticket => 
          api.post(
            `/tenants/${tenantId}/games/${game.id}/tickets/${ticket.id}/book-direct`,
            { playerName, playerPhone },
            { headers }
          )
        )
      );
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed === 0) {
        showToast(`Successfully booked ${succeeded} ticket(s) for ${playerName}!`, "success");
      } else if (succeeded > 0) {
        showToast(`Booked ${succeeded} ticket(s). ${failed} failed (likely already taken).`, "error");
      } else {
        showToast(`Failed to book any tickets. They might be already taken.`, "error");
      }

      setIsModalOpen(false);
      setSelectedTickets([]);
      setPlayerName("");
      setPlayerPhone("");
      
      showLoader("Refreshing Tickets...");
      router.refresh();
      setTimeout(() => hideLoader(), 500);
    } catch (err: any) {
      showToast(err.message || "Failed to book tickets", "error");
      setIsModalOpen(false);
      
      router.refresh();
      hideLoader();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">All Tickets</h2>
          <p className="text-sm text-slate-400">View and manually book tickets for the current game</p>
        </div>
        
        <div className="flex bg-slate-800/80 p-1.5 rounded-lg border border-slate-700 shadow-inner">
          <button 
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'all' ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All ({tickets.length})
          </button>
          <button 
            onClick={() => { setFilter('available'); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'available' ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500' : 'text-emerald-500/80 hover:text-emerald-400'}`}
          >
            Available ({tickets.filter(t => t.status === 'available').length})
          </button>
          <button 
            onClick={() => { setFilter('booked'); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'booked' ? 'bg-violet-600 text-white shadow-sm ring-1 ring-violet-500' : 'text-violet-400/80 hover:text-violet-300'}`}
          >
            Booked ({tickets.filter(t => t.status === 'booked').length})
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
                  onClick={() => {
                    if (selectedTickets.find(t => t.id === ticket.id)) {
                      setSelectedTickets(prev => prev.filter(t => t.id !== ticket.id));
                    } else {
                      if (selectedTickets.length >= 6) {
                         showToast("You can only select up to 6 tickets at a time.", "error");
                         return;
                      }
                      setSelectedTickets(prev => [...prev, ticket]);
                    }
                  }}
                  className={`w-full font-bold py-2 rounded-lg text-sm transition shadow-sm ${
                    selectedTickets.find(t => t.id === ticket.id) 
                      ? "bg-violet-600 hover:bg-violet-500 text-white" 
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {selectedTickets.find(t => t.id === ticket.id) ? "Selected" : "Select Ticket"}
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

      {/* Floating Action Bar */}
      {selectedTickets.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 animate-in slide-in-from-bottom-10">
          <div className="bg-slate-800 border border-slate-700 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-6 pointer-events-auto w-full max-w-lg">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selected Tickets</span>
              <span className="text-white font-black text-xl">{selectedTickets.length} <span className="text-slate-500 text-sm font-normal">/ 6 Max</span></span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedTickets([])}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-3 rounded-xl transition font-bold"
                title="Clear selection"
              >
                ✕
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-900/20 transition flex items-center gap-2"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isModalOpen && selectedTickets.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="border-b border-slate-800 p-4 flex flex-col gap-1 relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white">✕</button>
              <h3 className="font-bold text-white text-lg">Book {selectedTickets.length} Ticket{selectedTickets.length > 1 ? 's' : ''}</h3>
              <p className="text-xs text-slate-400">Tickets: {selectedTickets.map(t => `#${t.ticket_number}`).join(', ')}</p>
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20 transition"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
