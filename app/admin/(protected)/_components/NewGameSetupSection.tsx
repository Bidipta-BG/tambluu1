"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import type { Game, Tenant } from "@/types";

interface NewGameSetupSectionProps {
  tenantId: string;
  game: Game | null;
  isBumperGame?: boolean;
  websiteStatus?: "open" | "closed";
}

export default function NewGameSetupSection({ tenantId, game, isBumperGame, websiteStatus = "open" }: NewGameSetupSectionProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [isPending, startTransition] = useTransition();
  
  // Format initial datetime-local string
  let defaultDateTime = "";
  if (game?.scheduled_at) {
    const d = new Date(game.scheduled_at);
    // Adjust to local time format YYYY-MM-DDTHH:mm
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    defaultDateTime = localISOTime;
  }

  // Get current local date for the 'min' attribute
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const minDateTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);

  const [dateTime, setDateTime] = useState(defaultDateTime || minDateTime);

  const maxLimit = isBumperGame ? 1800 : 900;
  const [totalTickets, setTotalTickets] = useState<number | "">(
    game?.total_tickets 
      ? Math.min(game.total_tickets, maxLimit) 
      : maxLimit
  );
  
  const [ticketPrice, setTicketPrice] = useState<number | "">(game?.ticket_price ?? 100);
  const [agencyCommission, setAgencyCommission] = useState<number | "">(
    (game as any)?.agency_commission ?? 50
  );
  
  const [bookingStatus, setBookingStatus] = useState(game?.booking_status ?? "open");
  const [currentWebsiteStatus, setCurrentWebsiteStatus] = useState(websiteStatus);
  const [loading, setLoading] = useState(false);

  // Sync state if the game prop changes externally (e.g. from loading a backup)
  useEffect(() => {
    if (game) {
      if (game.scheduled_at) {
        const d = new Date(game.scheduled_at);
        const tzoff = (new Date()).getTimezoneOffset() * 60000;
        setDateTime((new Date(d.getTime() - tzoff)).toISOString().slice(0, 16));
      }
      setTotalTickets(Math.min(game.total_tickets, maxLimit));
      setTicketPrice(game.ticket_price);
      setAgencyCommission((game as any).agency_commission || 0);
      setBookingStatus(game.booking_status);
    }
  }, [game]);

  useEffect(() => {
    if (loading || isPending) {
      showLoader(loading ? "Saving Game Setup..." : "Refreshing Dashboard...");
    } else {
      hideLoader();
    }
  }, [loading, isPending]);

  const handleSave = async () => {
    if (!dateTime) return alert("Please select a date and time");
    const selectedDateObj = new Date(dateTime);

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
          agencyCommission: Number(agencyCommission || 0),
          callIntervalSeconds: 8, // Default for new game
        }, { headers });
        alert("Game created successfully!");
      } else {
        // Update existing game
        await api.patch(`/tenants/${tenantId}/games/${game.id}`, {
          scheduledAt: selectedDateObj.toISOString(),
          totalTickets: Number(totalTickets),
          ticketPrice: Number(ticketPrice),
          agencyCommission: Number(agencyCommission || 0),
          booking_status: bookingStatus,
        }, { headers });
        alert("Game settings saved successfully!");
      }

      // Update Website Status if changed
      if (currentWebsiteStatus !== websiteStatus) {
        await api.patch(`/tenants/${tenantId}`, {
          website_status: currentWebsiteStatus,
        }, { headers });
      }
      
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      const msg = e.message.toLowerCase();
      if (msg.includes("time") || msg.includes("date") || msg.includes("future") || msg.includes("past") || msg.includes("scheduled")) {
        alert("Please select a correct game timing (must be in the future).");
      } else {
        alert("Error saving game: " + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isUpdating = game && game.status !== 'completed';

  return (
    <div className="w-full bg-[#0a0088] flex flex-col p-4 shadow-lg mx-auto border-t-2 border-slate-700 max-w-xl">
      <h2 className="text-white font-black text-xl text-center uppercase tracking-widest mb-4 mt-2">
        GAME SETTINGS
      </h2>

      <div className="w-full border-2 border-black flex flex-col bg-white overflow-hidden">
        
        {/* Table Header */}
        <div className="flex w-full bg-black text-white">
          <div className="w-1/2 p-2.5 font-bold text-sm border-r border-black">
            Settings type
          </div>
          <div className="w-1/2 p-2.5 font-bold text-sm">
            Settings value
          </div>
        </div>

        {/* Row 1: Game date-time */}
        <div className="flex w-full border-b border-[#0a0088]">
          <div className="w-1/2 p-2.5 font-bold text-sm text-black border-r border-[#0a0088] flex items-center bg-white">
            Game date-time
          </div>
          <div className="w-1/2 p-2.5 bg-white">
            <input 
              type="datetime-local" 
              value={dateTime}
              min={minDateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full bg-transparent font-bold text-sm text-black outline-none"
            />
          </div>
        </div>

        {/* Row 2: Total ticket */}
        <div className="flex w-full border-b border-[#0a0088]">
          <div className="w-1/2 p-2.5 font-bold text-sm text-black border-r border-[#0a0088] flex items-center bg-white">
            Total ticket(Max:{maxLimit})
          </div>
          <div className="w-1/2 p-2.5 bg-white">
            <input 
              type="number" 
              value={totalTickets}
              onChange={(e) => {
                const str = e.target.value;
                if (str === "") {
                  setTotalTickets("");
                  return;
                }
                const val = Number(str);
                if (val > maxLimit) {
                  setTotalTickets(maxLimit);
                } else {
                  setTotalTickets(val);
                }
              }}
              onBlur={() => {
                if (totalTickets === "" || Number(totalTickets) < 1) {
                  setTotalTickets(10);
                }
              }}
              max={maxLimit}
              className="w-full bg-transparent font-bold text-sm text-black outline-none"
            />
          </div>
        </div>

        {/* Row 3: Ticket price */}
        <div className="flex w-full border-b border-[#0a0088]">
          <div className="w-1/2 p-2.5 font-bold text-sm text-black border-r border-[#0a0088] flex items-center bg-white">
            Ticket price
          </div>
          <div className="w-1/2 p-2.5 bg-white">
            <input 
              type="number" 
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-transparent font-bold text-sm text-black outline-none"
            />
          </div>
        </div>

        {/* Row 4: Agent commission */}
        <div className="flex w-full border-b border-[#0a0088]">
          <div className="w-1/2 p-2.5 font-bold text-sm text-black border-r border-[#0a0088] flex items-center bg-white">
            Agent commission
          </div>
          <div className="w-1/2 p-2.5 bg-white">
            <input 
              type="number" 
              value={agencyCommission}
              onChange={(e) => setAgencyCommission(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-transparent font-bold text-sm text-black outline-none"
            />
          </div>
        </div>

        {/* Row 5: Settings type (Fixed) */}
        <div className="flex w-full border-b border-[#0a0088]">
          <div className="w-1/2 p-2.5 font-bold text-sm text-black border-r border-[#0a0088] flex items-center bg-white">
            Settings type
          </div>
          <div className="w-1/2 p-2.5 bg-white flex items-center">
            <span className="font-bold text-sm text-black uppercase">INR</span>
          </div>
        </div>

        {/* Row 6: Website status */}
        <div className="flex w-full border-b border-[#0a0088]">
          <div className="w-1/2 p-2.5 font-bold text-sm text-black border-r border-[#0a0088] flex items-center bg-white">
            Website status
          </div>
          <div className="w-1/2 p-2.5 bg-white">
            <select
              value={currentWebsiteStatus}
              onChange={(e) => setCurrentWebsiteStatus(e.target.value as "open" | "closed")}
              className="w-full bg-transparent font-bold text-sm text-black outline-none uppercase cursor-pointer"
            >
              <option value="open">WE ARE OPEN</option>
              <option value="closed">WE ARE CLOSED</option>
            </select>
          </div>
        </div>

        {/* Row 7: Booking status */}
        <div className="flex w-full border-b border-[#0a0088]">
          <div className="w-1/2 p-2.5 font-bold text-sm text-black border-r border-[#0a0088] flex items-center bg-white">
            Booking status
          </div>
          <div className="w-1/2 p-2.5 bg-white">
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value as "open" | "closed")}
              className="w-full bg-transparent font-bold text-sm text-black outline-none uppercase cursor-pointer"
            >
              <option value="open">BOOKING OPEN</option>
              <option value="closed">BOOKING CLOSED</option>
            </select>
          </div>
        </div>

        {/* Submit Button Row (Only second column) */}
        <div className="flex w-full">
          <div className="w-1/2 bg-[#0a0088]"></div>
          <button 
            onClick={handleSave}
            disabled={loading || isPending}
            className="w-1/2 bg-[#ff0000] text-white font-black text-sm p-3 uppercase text-center active:bg-red-700 transition-colors"
          >
            CREATE NEW GAME
          </button>
        </div>

      </div>
    </div>
  );
}
