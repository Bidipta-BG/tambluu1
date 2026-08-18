"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { useGamePolling, type RealtimeCalledNumber, type RealtimeWinnerRow, type RealtimeGameRow } from "../../../../../../(public)/_hooks/useGamePolling";
import type { Game, GameState, Winner, GameStatus } from "@/types";
import { cn } from "@/lib/cn";

interface GameRunnerClientProps {
  tenantId: string;
  game: Game;
  initialState: GameState;
  businessName?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function GameRunnerClient({ tenantId, game, initialState, businessName }: GameRunnerClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // --- Realtime State ---
  const [status, setStatus] = useState<GameStatus>(game.status);
  const [calledNumbers, setCalledNumbers] = useState<number[]>(initialState.called_numbers);
  const [winners, setWinners] = useState<Winner[]>(initialState.winners);
  
  // Track sequence for log ordering (assuming backend handles sequence, we just prepend to a local list for UI)
  const [recentCalls, setRecentCalls] = useState<RealtimeCalledNumber[]>([]);

  // --- UI Controls State ---
  const [intervalSeconds, setIntervalSeconds] = useState(game.call_interval_seconds.toString());
  const [loading, setLoading] = useState(false);

  // Subscribe to Polling
  const channelStatus = useGamePolling({
    tenantId: tenantId,
    gameId: game.id,
    onCalledNumber: (payload) => {
      setCalledNumbers((prev) => {
        if (prev.includes(payload.number)) return prev;
        return [...prev, payload.number];
      });
      setRecentCalls((prev) => [payload, ...prev].slice(0, 10)); // keep last 10 in log
    },
    onNewWinner: (payload) => {
      // Create a partial winner object for the UI list
      const newWinner: Winner = {
        id: payload.id,
        player_name: "Winner (Loading...)", // Would need a join to get name, or just display ticket ID
        prize_type: "Claimed", // Requires dividend join
        ticket_number: 0,
        matched_numbers: payload.matched_numbers,
        claimed_at: payload.created_at,
      };
      setWinners((prev) => [newWinner, ...prev]);
    },
    onGameStatusChange: (payload) => {
      setStatus(payload.status);
    },
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function apiPost(action: string, payload?: any) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const res = await fetch(`${API_BASE}/tenants/${tenantId}/games/${game.id}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!res.ok) {
      let msg = `Failed to ${action}`;
      try {
        const body = await res.json();
        msg = body.message || msg;
      } catch (e) {}
      throw new Error(msg);
    }
  }

  async function apiPatch(payload: any) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const res = await fetch(`${API_BASE}/tenants/${tenantId}/games/${game.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to update game");
  }

  async function handleStartGame() {
    setLoading(true);
    try {
      // 1. Update call interval and status to 'running' (though engine might set status)
      await apiPatch({ 
        call_interval_seconds: parseInt(intervalSeconds, 10),
        status: "running"
      });
      // 2. Start engine
      await apiPost("run");
      showToast("Game started successfully", "success");
      setStatus("running");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePauseGame() {
    setLoading(true);
    try {
      await apiPost("pause");
      showToast("Game paused", "success");
      // Status update will come via realtime or we could manually set it if there's a 'paused' state.
      // Assuming 'running' is just the general state and the backend pauses the chron.
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteGame() {
    setLoading(true);
    try {
      await apiPost("complete");
      showToast("Game completed", "success");
      setStatus("completed");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCallNext() {
    setLoading(true);
    try {
      await apiPost("call-next");
      showToast("Called next number", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-50">{businessName || "Game Runner"}</h1>
          <p className="text-sm text-slate-400 mt-1">Live control panel for Game ID: <span className="font-mono text-xs">{game.id}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
            <div className={cn(
              "h-2 w-2 rounded-full",
              channelStatus === "SUBSCRIBED" ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
            )} />
            <span className={channelStatus === "SUBSCRIBED" ? "text-emerald-400" : "text-slate-400"}>
              {channelStatus === "SUBSCRIBED" ? "Live Connected" : channelStatus}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
            <span className={cn(
              status === "scheduled" && "text-slate-400",
              status === "running" && "text-amber-400 animate-pulse",
              status === "completed" && "text-violet-400"
            )}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: The Board */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
            
            <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center justify-between">
              <span>Tambola Board</span>
              <span className="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                {calledNumbers.length} / 90 Called
              </span>
            </h2>

            <div className="grid grid-cols-10 gap-2 sm:gap-3">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => {
                const isCalled = calledNumbers.includes(num);
                const isLast = recentCalls[0]?.number === num;
                
                return (
                  <div
                    key={num}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-xl text-lg sm:text-xl font-black transition-all duration-300",
                      isCalled 
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 scale-105 ring-2 ring-white/20" 
                        : "bg-slate-800 text-slate-400 shadow-inner border border-slate-700/50",
                      isLast && "ring-4 ring-emerald-400 animate-pulse"
                    )}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Controls & Logs */}
        <div className="space-y-6 flex flex-col h-full">
          
          {/* Controls Panel */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Game Controls</h3>
            
            {status === "scheduled" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Call Interval</label>
                  <select
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                  >
                    {[5, 8, 10, 12, 15, 20].map(sec => (
                      <option key={sec} value={sec}>{sec} Seconds</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleStartGame}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  START GAME
                </button>
              </div>
            )}

            {status === "running" && (
              <div className="space-y-3">
                <button
                  onClick={handleCallNext}
                  disabled={loading}
                  className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 py-3 text-sm font-bold text-violet-400 shadow-sm hover:bg-violet-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  Call Next Number Now
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handlePauseGame}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-amber-500/10 border border-amber-500/30 py-2 text-sm font-bold text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Pause
                  </button>
                  <button
                    onClick={handleCompleteGame}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-slate-800 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Complete
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Logs */}
          <div className="flex-1 flex flex-col gap-6 min-h-[400px]">
            {/* Recent Calls */}
            <section className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col overflow-hidden">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Calls</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {recentCalls.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">No numbers called yet.</p>
                ) : (
                  recentCalls.map((rc, i) => (
                    <div key={rc.number || i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 animate-in fade-in slide-in-from-left-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 font-black text-sm">
                          {rc.number}
                        </div>
                        <span className="text-xs text-slate-400">Sequence #{rc.sequence}</span>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Claims / Winners */}
            <section className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col overflow-hidden">
              <h3 className="text-sm font-bold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Claims & Winners</span>
                <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px]">{winners.length} Total</span>
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {winners.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">No winners yet.</p>
                ) : (
                  winners.map((w, i) => (
                    <div key={w.id || i} className="flex flex-col gap-1.5 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">{w.prize_type}</span>
                        <span className="text-[10px] text-slate-500">{new Date(w.claimed_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{w.player_name}</p>
                      <p className="text-xs text-slate-400">Ticket #{w.ticket_number}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
