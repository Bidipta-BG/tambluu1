"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import type { Game, Dividend, GameUpdatePayload, Ticket } from "@/types";
import { cn } from "@/lib/cn";

interface EditGameClientProps {
  tenantId: string;
  game: Game;
  initialDividends: Dividend[];
  tickets: Ticket[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const PATTERN_TYPES = [
  "top_line",
  "middle_line",
  "bottom_line",
  "full_house_1",
  "full_house_2",
  "full_house_3",
  "quick_five",
  "half_seat_bonus",
  "corners",
];

export default function EditGameClient({ tenantId, game, initialDividends, tickets: initialTickets }: EditGameClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // --- Game Settings State ---
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (!game.scheduled_at) return "";
    const d = new Date(game.scheduled_at);
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [totalTickets, setTotalTickets] = useState(game.total_tickets.toString());
  const [ticketPrice, setTicketPrice] = useState(game.ticket_price.toString());
  const [callIntervalSeconds, setCallIntervalSeconds] = useState(game.call_interval_seconds.toString());
  const [bookingStatus, setBookingStatus] = useState(game.booking_status);
  const [savingGame, setSavingGame] = useState(false);

  // --- Dividends State ---
  const [dividends, setDividends] = useState<Dividend[]>(initialDividends);
  const [savingDividends, setSavingDividends] = useState(false);

  // --- Reset Modals ---
  const [showResetTickets, setShowResetTickets] = useState(false);
  const [showResetGame, setShowResetGame] = useState(false);
  const [resetting, setResetting] = useState(false);

  // --- Manual Booking State ---
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [bookingTicketId, setBookingTicketId] = useState<string | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleSaveGame(e: React.FormEvent) {
    e.preventDefault();
    setSavingGame(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const payload: GameUpdatePayload = {
        scheduled_at: new Date(scheduledAt).toISOString(),
        total_tickets: parseInt(totalTickets, 10),
        ticket_price: parseFloat(ticketPrice),
        call_interval_seconds: parseInt(callIntervalSeconds, 10),
        booking_status: bookingStatus,
      };

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/games/${game.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save game settings");
      showToast("Game settings saved", "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSavingGame(false);
    }
  }

  async function handleSaveDividends() {
    setSavingDividends(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/games/${game.id}/dividends`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ dividends }),
      });

      if (!res.ok) throw new Error("Failed to save dividends");
      showToast("Dividends saved", "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSavingDividends(false);
    }
  }

  async function handleReset(type: "tickets" | "game") {
    setResetting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/games/${game.id}/reset-${type}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        },
      });

      if (!res.ok) throw new Error(`Failed to reset ${type}`);
      showToast(`${type === 'tickets' ? 'Tickets' : 'Game'} reset successfully`, "success");
      setShowResetTickets(false);
      setShowResetGame(false);
      router.refresh();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setResetting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Dividends row management
  // ---------------------------------------------------------------------------

  const addDividend = () => {
    setDividends([
      ...dividends,
      { name: "New Prize", pattern_type: "top_line", is_active: true, prize_amount: 0 }
    ]);
  };

  const removeDividend = (index: number) => {
    setDividends(dividends.filter((_, i) => i !== index));
  };

  const updateDividend = (index: number, field: keyof Dividend, value: any) => {
    const newDividends = [...dividends];
    newDividends[index] = { ...newDividends[index], [field]: value };
    setDividends(newDividends);
  };

  // ---------------------------------------------------------------------------
  // Manual Booking
  // ---------------------------------------------------------------------------

  async function handleBookManual(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingTicketId) return;

    setBookingSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const payload = {
        name: bookingName,
        phone: bookingPhone,
        ticket_id: bookingTicketId,
      };

      // Assuming backend has a direct booking endpoint for admins
      const res = await fetch(`${API_BASE}/tenants/${tenantId}/games/${game.id}/book-direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to book ticket");
      
      showToast("Ticket booked successfully", "success");
      setBookingTicketId(null);
      setBookingName("");
      setBookingPhone("");
      router.refresh();
      
      // Optimistically update local ticket state
      setTickets(tickets.map(t => 
        t.id === bookingTicketId ? { ...t, status: "confirmed", player_name: bookingName, player_phone: bookingPhone } : t
      ));
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setBookingSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-50">Manage Game</h1>
          <p className="text-sm text-slate-400 mt-1">ID: <span className="font-mono text-xs">{game.id}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Settings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Settings */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-5">Game Settings</h2>
            <form onSubmit={handleSaveGame} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-400">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-400">Call Interval (s)</label>
                  <input
                    type="number"
                    min="1"
                    value={callIntervalSeconds}
                    onChange={(e) => setCallIntervalSeconds(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-400">Total Tickets</label>
                  <input
                    type="number"
                    min="1"
                    value={totalTickets}
                    onChange={(e) => setTotalTickets(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-400">Ticket Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-300">Booking Status</span>
                  <button
                    type="button"
                    onClick={() => setBookingStatus(s => s === "open" ? "closed" : "open")}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      bookingStatus === "open" ? "bg-emerald-500" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        bookingStatus === "open" ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                  <span className={cn("text-xs font-semibold", bookingStatus === "open" ? "text-emerald-400" : "text-slate-500")}>
                    {bookingStatus.toUpperCase()}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingGame}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {savingGame ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </section>

          {/* Dividends */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200">Dividends (Prizes)</h2>
              <button
                onClick={addDividend}
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
              >
                + Add row
              </button>
            </div>

            <div className="space-y-3">
              {dividends.map((div, i) => (
                <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-xl border border-slate-700/50 bg-slate-800/30">
                  <input
                    type="text"
                    value={div.name}
                    onChange={(e) => updateDividend(i, "name", e.target.value)}
                    placeholder="Prize Name"
                    className="flex-1 min-w-[120px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-50 outline-none focus:border-violet-500"
                  />
                  <select
                    value={div.pattern_type}
                    onChange={(e) => updateDividend(i, "pattern_type", e.target.value)}
                    className="flex-1 min-w-[120px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-50 outline-none focus:border-violet-500"
                  >
                    {PATTERN_TYPES.map(pt => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">₹</span>
                    <input
                      type="number"
                      value={div.prize_amount}
                      onChange={(e) => updateDividend(i, "prize_amount", parseFloat(e.target.value))}
                      className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-50 outline-none focus:border-violet-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={div.is_active}
                      onChange={(e) => updateDividend(i, "is_active", e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                    />
                    Active
                  </label>
                  <button
                    onClick={() => removeDividend(i)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-5 mt-5 flex justify-end border-t border-slate-800">
              <button
                onClick={handleSaveDividends}
                disabled={savingDividends}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {savingDividends ? "Saving..." : "Save Dividends"}
              </button>
            </div>
          </section>

        </div>

        {/* Right Col: Danger Zone & Manual Booking */}
        <div className="space-y-6">
          
          {/* Manual Booking Grid */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-2">Book Ticket Manually</h2>
            <p className="text-sm text-slate-400 mb-4">Click an available ticket to book it directly.</p>
            
            <div className="flex items-center gap-3 mb-4 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-700" />Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" />Reserved</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Booked</span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {Array.from({ length: game.total_tickets }, (_, i) => {
                const num = i + 1;
                const ticket = tickets.find(t => t.ticket_number === num);
                const status = ticket?.status || "available";
                
                return (
                  <button
                    key={num}
                    disabled={status === "confirmed" || status === "booked"}
                    onClick={() => {
                      if (ticket) setBookingTicketId(ticket.id);
                    }}
                    className={cn(
                      "aspect-square rounded-md flex items-center justify-center text-[11px] font-bold transition-all",
                      status === "available" && "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer",
                      status === "booked" && "bg-violet-500/20 text-violet-400 border border-violet-500/30 cursor-not-allowed",
                      status === "confirmed" && "bg-amber-400 text-amber-950 shadow-sm cursor-not-allowed"
                    )}
                    title={ticket ? `${status.charAt(0).toUpperCase() + status.slice(1)} - ${ticket.player_name || 'No name'}` : "Available"}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-red-500/20 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
            <p className="text-sm text-slate-400 mb-6">
              Destructive actions that cannot be undone. Use with extreme caution.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-slate-200">Reset Tickets</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Clears all booked and confirmed tickets. Useful for wiping test data before a game starts.
                </p>
                <button
                  onClick={() => setShowResetTickets(true)}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition"
                >
                  Reset Tickets
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-slate-200">Reset Game</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Clears all called numbers and winners. Resets game status to scheduled.
                </p>
                <button
                  onClick={() => setShowResetGame(true)}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition"
                >
                  Reset Game State
                </button>
              </div>
            </div>
          </section>
        </div>

      </div>

      {/* Confirmation Modals */}
      {(showResetTickets || showResetGame) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-slate-900 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-4">
              <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <h2 className="text-lg font-bold text-slate-50 mb-2">Are you absolutely sure?</h2>
            <p className="text-sm text-slate-400 mb-6">
              This action will permanently delete data and cannot be reversed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetTickets(false);
                  setShowResetGame(false);
                }}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReset(showResetTickets ? "tickets" : "game")}
                disabled={resetting}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {resetting ? "Resetting..." : "Yes, reset it"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Booking Modal */}
      {bookingTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 p-6">
            <h2 className="text-lg font-bold text-slate-50 mb-1">Book Ticket #{tickets.find(t => t.id === bookingTicketId)?.ticket_number}</h2>
            <p className="text-sm text-slate-400 mb-6">Enter player details for manual booking.</p>
            
            <form onSubmit={handleBookManual} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Player Name</label>
                <input
                  type="text"
                  required
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">WhatsApp Number</label>
                <input
                  type="tel"
                  required
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setBookingTicketId(null);
                    setBookingName("");
                    setBookingPhone("");
                  }}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {bookingSubmitting ? "Booking..." : "Confirm Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
