"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Game, Tenant } from "@/types";

interface GameSetupSectionProps {
  tenantId: string;
  game: Game | null;
  isBumperGame?: boolean;
}

export default function GameSetupSection({ tenantId, game, isBumperGame }: GameSetupSectionProps) {
  const router = useRouter();
  
  // Format the existing scheduled_at to date and 12-hour components
  let defaultDateOnly = "";
  let defaultHour12 = "12";
  let defaultMinute = "00";
  let defaultAmpm = "PM";

  if (game?.scheduled_at) {
    const d = new Date(game.scheduled_at);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    defaultDateOnly = `${year}-${month}-${day}`;
    
    let h24 = d.getHours();
    defaultMinute = String(d.getMinutes()).padStart(2, '0');
    defaultAmpm = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    defaultHour12 = String(h12).padStart(2, '0');
  }

  // Get current local date for the 'min' attribute
  const now = new Date();
  const minYear = now.getFullYear();
  const minMonth = String(now.getMonth() + 1).padStart(2, '0');
  const minDay = String(now.getDate()).padStart(2, '0');
  const minDateOnly = `${minYear}-${minMonth}-${minDay}`;

  // If new game, default to today
  const [dateOnly, setDateOnly] = useState(defaultDateOnly || minDateOnly);
  const [hour12, setHour12] = useState(defaultHour12);
  const [minute, setMinute] = useState(defaultMinute);
  const [ampm, setAmpm] = useState(defaultAmpm);

  const maxLimit = isBumperGame ? 999 : 499;
  const [totalTickets, setTotalTickets] = useState(
    game?.total_tickets 
      ? Math.min(game.total_tickets, maxLimit) 
      : maxLimit
  );
  const [ticketPrice, setTicketPrice] = useState(game?.ticket_price ?? 100);
  const [bookingStatus, setBookingStatus] = useState(game?.booking_status ?? "closed");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // Parse the constructed 12-hour time into a valid Date object
    let h24 = parseInt(hour12, 10);
    if (ampm === "PM" && h24 !== 12) h24 += 12;
    if (ampm === "AM" && h24 === 12) h24 = 0;
    
    const [y, m, d] = dateOnly.split("-").map(Number);
    const selectedDateObj = new Date(y, m - 1, d, h24, parseInt(minute, 10));

    // Prevent saving dates in the past or exactly current (strict future time required)
    const selectedTime = selectedDateObj.getTime();
    if (selectedTime <= Date.now()) {
      return alert("Please select a correct game timing (must be in the future).");
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      if (!game || game.status === 'completed') {
        // Create new game
        await api.post(`/tenants/${tenantId}/games`, {
          scheduledAt: selectedDateObj.toISOString(),
          totalTickets: Number(totalTickets),
          ticketPrice: Number(ticketPrice),
          agencyCommission: 0, // Default for new game
          callIntervalSeconds: 8, // Default for new game
        }, { headers });
        alert("Game created successfully!");
      } else {
        // Update existing game
        await api.patch(`/tenants/${tenantId}/games/${game.id}`, {
          scheduledAt: selectedDateObj.toISOString(),
          totalTickets: Number(totalTickets),
          ticketPrice: Number(ticketPrice),
          booking_status: bookingStatus,
        }, { headers });
        alert("Game settings saved successfully!");
      }
      router.refresh();
    } catch (e: any) {
      const msg = e.message.toLowerCase();
      // If the API error is related to time/date validation, show a friendly alert
      if (msg.includes("time") || msg.includes("date") || msg.includes("future") || msg.includes("past") || msg.includes("scheduled")) {
        alert("Please select a correct game timing (must be in the future).");
      } else {
        alert("Error saving game: " + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
      <h2 className="text-lg font-bold text-white mb-4">Game Setup</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end">
        
        {/* Date Selector */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Game Date</label>
          <input 
            type="date" 
            value={dateOnly}
            min={minDateOnly}
            onChange={(e) => setDateOnly(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        {/* Time Selector */}
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Game Time (AM/PM)</label>
          <div className="flex items-center gap-2">
            <select 
              value={hour12} 
              onChange={(e) => setHour12(e.target.value)}
              className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm appearance-none text-center"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const val = String(i + 1).padStart(2, '0');
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
            <span className="text-slate-400 font-bold">:</span>
            <select 
              value={minute} 
              onChange={(e) => setMinute(e.target.value)}
              className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm appearance-none text-center"
            >
              {Array.from({ length: 60 }, (_, i) => {
                const val = String(i).padStart(2, '0');
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
            <select 
              value={ampm} 
              onChange={(e) => setAmpm(e.target.value)}
              className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm appearance-none text-center"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
        
        {/* Total Tickets */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Total Tickets <span className="text-amber-500 text-[10px]">(Max {maxLimit})</span>
          </label>
          <input 
            type="number" 
            min="1" 
            max={maxLimit}
            value={totalTickets}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val > maxLimit) {
                setTotalTickets(maxLimit);
              } else {
                setTotalTickets(val);
              }
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        {/* Ticket Price */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Ticket Price</label>
          <input 
            type="number" 
            min="0"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        {/* Booking Status */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Booking Status</label>
          <select 
            value={bookingStatus}
            onChange={(e) => setBookingStatus(e.target.value as "open" | "closed")}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm appearance-none"
          >
            <option value="open">Open (Players can book)</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 mt-2 rounded-lg text-sm transition"
      >
        {loading ? "Saving..." : (!game || game.status === 'completed' ? "Setup Next Game" : "Save Settings")}
      </button>
    </div>
  );
}
