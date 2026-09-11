"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import type { Game } from "@/types";
import { ShowCurrentTicketsModal } from "./ShowCurrentTicketsModal";
import { ShowCurrentWinnersModal } from "./ShowCurrentWinnersModal";
import { TicketHistoryModal } from "./TicketHistoryModal";
import { WinnerHistoryModal } from "./WinnerHistoryModal";
import { BusinessHistoryModal } from "./BusinessHistoryModal";

interface RunGameSectionProps {
  tenantId: string;
  game: Game | null;
}

export default function RunGameSection({ tenantId, game }: RunGameSectionProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [countdown, setCountdown] = useState("");
  const [intervalSec, setIntervalSec] = useState(game?.call_interval_seconds || 10);
  const [loading, setLoading] = useState(false);
  const [isTimeReached, setIsTimeReached] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showGameEndedPopup, setShowGameEndedPopup] = useState(false);
  
  const [showCurrentTickets, setShowCurrentTickets] = useState(false);
  const [showCurrentWinners, setShowCurrentWinners] = useState(false);
  const [showTicketHistory, setShowTicketHistory] = useState(false);
  const [showWinnerHistory, setShowWinnerHistory] = useState(false);
  const [showBusinessHistory, setShowBusinessHistory] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Poll backend if the local state thinks game is running, to detect background completion and pause state
  useEffect(() => {
    if (!game || game.status !== "running") return;
    
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-state?tenantId=${tenantId}&gameId=${game.id}`);
        if (res.ok) {
          const json = await res.json();
          const state = json.data || json;
          if (state && state.status === "completed") {
            setShowGameEndedPopup(true);
            clearInterval(intervalId);
          } else if (state && state.status === "running") {
            setIsPaused(state.isPaused ?? false);
          }
        }
      } catch (err) {
        // silently ignore fetch errors
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [game?.status, tenantId, game?.id]);

  useEffect(() => {
    if (loading || isPending) {
      showLoader(loading ? "Processing..." : "Refreshing Dashboard...");
    } else {
      hideLoader();
    }
  }, [loading, isPending]);

  // Sync state if game changes
  useEffect(() => {
    if (game?.call_interval_seconds) {
      setIntervalSec(game.call_interval_seconds);
    }
  }, [game?.call_interval_seconds]);

  useEffect(() => {
    if (!game?.scheduled_at) return;
    
    const target = new Date(game.scheduled_at).getTime();
    
    const tick = () => {
      const now = new Date().getTime();
      const distance = target - now;
      
      if (distance < 0) {
        setCountdown("00:00:00");
        setIsTimeReached(true);
        return true; // Stop interval
      }
      
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
      setIsTimeReached(false);
      return false; // Keep running
    };

    // Run immediately before interval
    const shouldStop = tick();
    if (shouldStop) return;

    const timer = setInterval(() => {
      if (tick()) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [game?.scheduled_at]);

  const handleIntervalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = Number(e.target.value);
    setIntervalSec(newVal);
    
    // If game is live/paused, immediately push the change to the backend
    if (game?.status === 'running') {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not logged in");
        
        await api.post(
          `/tenants/${tenantId}/games/${game.id}/update-interval`,
          { intervalSeconds: newVal },
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
      } catch (err) {
        console.error("Failed to update interval:", err);
      }
    }
  };

  const handleAction = async (action: "reset-tickets" | "shuffle-tickets" | "reset-game" | "reset-agents" | "reset-call" | "run" | "stop" | "pause" | "resume") => {
    if (!game) return;
    
    if (action === "reset-tickets" && !confirm("Are you sure you want to cancel all bookings? The ticket numbers will remain exactly the same.")) return;
    if (action === "shuffle-tickets" && !confirm("Are you sure you want to shuffle all tickets? This will cancel ALL bookings AND generate a completely new set of numbers.")) return;
    if (action === "reset-agents" && !confirm("Are you sure you want to delete all agents? This action cannot be undone.")) return;
    if (action === "reset-call" && !confirm("Are you sure you want to reset the call? This will wipe all called numbers and winners, and start the game fresh.")) return;
    if (action === "reset-game" && !confirm("Are you sure you want to reset the game state?")) return;

    setLoading(true);
    if (action === "reset-tickets") showLoader("Resetting Tickets...");
    else if (action === "shuffle-tickets") showLoader("Shuffling Tickets...");
    else if (action === "reset-agents") showLoader("Deleting Agents...");
    else if (action === "reset-call") showLoader("Resetting Call...");
    else if (action === "reset-game") showLoader("Resetting Game Board...");
    else if (action === "run") showLoader("Starting Game...");
    else if (action === "stop") showLoader("Stopping Game...");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      if (action === "run") {
        // Explicit check requested by user: verify the game time has actually passed 
        // using the local clock before hitting the API.
        const scheduledTime = new Date(game.scheduled_at || new Date().toISOString()).getTime();
        const currentTime = new Date().getTime();
        
        if (scheduledTime > currentTime) {
          alert("Please select a correct game timing.");
          setLoading(false);
          return;
        }

        // First update the call interval
        await api.patch(`/tenants/${tenantId}/games/${game.id}`, { callIntervalSeconds: intervalSec }, { headers });
      }
      
      if (action === "reset-agents") {
        await api.del(`/tenants/${tenantId}/agents`, { headers });
      } else {
        await api.post(`/tenants/${tenantId}/games/${game.id}/${action}`, {}, { headers });
      }
      
      if (action === "pause") {
        setIsPaused(true);
      } else if (action === "resume") {
        setIsPaused(false);
      }
      
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      if (action === "stop") {
        // If stopping fails, the game likely already ended (e.g., if the tab was kept open).
        // Silently refresh the dashboard to sync the UI state instead of showing an error.
        console.error(`Error performing ${action}:`, e.message);
        startTransition(() => {
          router.refresh();
        });
      } else if (action === "run" && e.message.toLowerCase().includes("scheduled time")) {
        // This happens if the local computer clock is slightly ahead of the server clock
        alert("Please select a correct game timing.");
      } else {
        alert(`Error performing ${action}: ` + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
      <h2 className="text-lg font-bold text-white mb-4">Start Game</h2>
      
      <div className="bg-slate-800 rounded-lg p-6 flex flex-col items-center justify-center border border-slate-700 mb-6">
        <span className="text-sm text-slate-400 font-semibold mb-2">COUNTDOWN</span>
        <div className="text-4xl md:text-5xl font-mono font-black text-amber-500 tracking-wider">
          {countdown || "00:00:00"}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button 
          onClick={() => handleAction("shuffle-tickets")}
          disabled={loading || game?.status !== "scheduled"}
          title={game?.status !== "scheduled" ? "Can only shuffle before the game starts" : "Shuffle and reset all tickets"}
          className={`flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition ${
            loading || game?.status !== "scheduled"
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-red-900/20 hover:bg-red-900/40 text-red-300 border border-red-800/50"
          }`}
        >
          Shuffle Tickets
        </button>
        <button 
          onClick={() => handleAction("reset-tickets")}
          disabled={loading || game?.status !== "scheduled"}
          title={game?.status !== "scheduled" ? "Can only reset before the game starts" : "Clear all bookings"}
          className={`flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition ${
            loading || game?.status !== "scheduled"
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-red-900/20 hover:bg-red-900/40 text-red-300 border border-red-800/50"
          }`}
        >
          Reset Tickets
        </button>

        <button 
          onClick={() => handleAction("reset-agents")}
          disabled={loading}
          title="Delete all agents from this tenant"
          className="flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition bg-red-900/20 hover:bg-red-900/40 text-red-300 border border-red-800/50"
        >
          Reset Agents
        </button>
      </div>

      <div className="flex items-end gap-3">
        <div className="w-32">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Interval (Sec)</label>
          <select 
            value={intervalSec}
            onChange={handleIntervalChange}
            disabled={!game || game.status === 'completed' || game.status === 'scheduled'}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center text-lg focus:outline-none focus:border-amber-500 transition"
          >
            <option value={8}>8 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={12}>12 seconds</option>
          </select>
        </div>
        
        {game?.status === "running" ? (
          <>
            <button
              onClick={() => handleAction(isPaused ? 'resume' : 'pause')}
              disabled={loading}
              className={`flex-1 font-black py-3 px-5 rounded-lg text-lg uppercase tracking-wider transition shadow-lg ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/50'
              }`}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button 
              onClick={() => handleAction("reset-call")}
              disabled={loading}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-3 px-6 rounded-lg text-lg uppercase tracking-wider transition shadow-lg shadow-rose-900/50"
            >
              Reset Call
            </button>
            <button 
              onClick={() => handleAction("stop")}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 px-6 rounded-lg text-lg uppercase tracking-wider transition shadow-lg shadow-red-900/50"
            >
              {loading ? "Processing..." : "Stop Game"}
            </button>
          </>
        ) : game?.status === "completed" ? (
          <button 
            disabled={true}
            className="flex-1 bg-slate-800 text-slate-500 font-black py-3 px-6 rounded-lg text-lg uppercase tracking-wider transition shadow-lg cursor-not-allowed"
          >
            Game Completed
          </button>
        ) : (
          <button 
            onClick={() => handleAction("run")}
            disabled={loading || !game || !isTimeReached}
            className={`flex-1 font-black py-3 px-6 rounded-lg text-lg uppercase tracking-wider transition shadow-lg ${
              !game || !isTimeReached
                ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50"
            }`}
          >
            {loading ? "Processing..." : "Start Game"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <button 
          onClick={() => setShowCurrentTickets(true)}
          className="flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-800/50"
        >
          📋 Current Tickets
        </button>
        <button 
          onClick={() => setShowCurrentWinners(true)}
          className="flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition bg-amber-900/20 hover:bg-amber-900/40 text-amber-300 border border-amber-800/50"
        >
          🏆 Current Winners
        </button>
        <button 
          onClick={() => setShowTicketHistory(true)}
          className="flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition bg-blue-900/20 hover:bg-blue-900/40 text-blue-300 border border-blue-800/50"
        >
          📚 Ticket History
        </button>
        <button 
          onClick={() => setShowWinnerHistory(true)}
          className="flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition bg-purple-900/20 hover:bg-purple-900/40 text-purple-300 border border-purple-800/50"
        >
          🥇 Winner History
        </button>
        <button 
          onClick={() => setShowBusinessHistory(true)}
          className="flex-1 min-w-[140px] font-bold py-2 px-4 rounded-lg text-sm transition bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/50"
        >
          💰 Business History
        </button>
      </div>

      {!isTimeReached && game?.status !== "running" && game?.status !== "completed" && (
        <p className="text-xs text-amber-500 mt-3 text-center">
          ⚠ Run Game button will unlock when countdown reaches 00:00:00
        </p>
      )}
      {game?.status === "completed" && (
        <p className="text-xs text-amber-500 mt-3 text-center">
          ⚠ This game has ended. Please use the Game Setup section above to schedule the next game.
        </p>
      )}

      <ShowCurrentTicketsModal 
        isOpen={showCurrentTickets} 
        onClose={() => setShowCurrentTickets(false)} 
        tenantId={tenantId} 
        gameId={game?.id || ""} 
      />
      <ShowCurrentWinnersModal 
        isOpen={showCurrentWinners} 
        onClose={() => setShowCurrentWinners(false)} 
        tenantId={tenantId} 
      />
      <TicketHistoryModal 
        isOpen={showTicketHistory} 
        onClose={() => setShowTicketHistory(false)} 
        tenantId={tenantId} 
      />
      <WinnerHistoryModal 
        isOpen={showWinnerHistory} 
        onClose={() => setShowWinnerHistory(false)} 
        tenantId={tenantId} 
      />
      <BusinessHistoryModal 
        isOpen={showBusinessHistory} 
        onClose={() => setShowBusinessHistory(false)} 
        tenantId={tenantId} 
      />

      {/* Pop-up blocker when game completes in the background */}
      {showGameEndedPopup && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-wide">GAME ENDED</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                The current game has been successfully completed and all prizes have been won.
                <br /><br />
                Please click continue to begin setting up a new game.
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-6 rounded-xl transition shadow-lg shadow-emerald-900/20 uppercase tracking-widest mt-4"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
