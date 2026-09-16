"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useTambolaVoice } from "../../../(public)/_hooks/useTambolaVoice";

type GameState = {
  status: string;
  isPaused: boolean;
  calledNumbers: number[];
  winners: any[];
  dividends: any[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  gameId: string;
  initialScheduledAt?: string;
  initialInterval?: number;
};

export function NewRunGameModal({ isOpen, onClose, tenantId, gameId, initialScheduledAt, initialInterval }: Props) {
  const [state, setState] = useState<GameState>({
    status: "scheduled",
    isPaused: false,
    calledNumbers: [],
    winners: [],
    dividends: []
  });
  
  const [countdown, setCountdown] = useState("");
  const [isTimeReached, setIsTimeReached] = useState(false);
  const [intervalSec, setIntervalSec] = useState(initialInterval || 10);
  const [loadingAction, setLoadingAction] = useState(false);

  // Countdown timer logic
  useEffect(() => {
    if (!initialScheduledAt) return;
    
    const target = new Date(initialScheduledAt).getTime();
    
    const tick = () => {
      const now = new Date().getTime();
      const distance = target - now;
      
      if (distance <= 0) {
        setCountdown("00:00:00");
        setIsTimeReached(true);
        return true;
      }
      
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setCountdown(
        `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
      setIsTimeReached(false);
      return false;
    };

    if (tick()) return;

    const timer = setInterval(() => {
      if (tick()) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [initialScheduledAt]);

  const { isSoundEnabled, toggleSound, speakNumber } = useTambolaVoice();

  // Polling loop
  useEffect(() => {
    if (!isOpen) return;
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/live-state?tenantId=${tenantId}&gameId=${gameId}`);
        if (res.ok) {
          const json = await res.json();
          setState(prevState => {
             const newNums = json.calledNumbers || [];
             const oldNums = prevState.calledNumbers || [];
             
             // Detect if a new number was added
             if (newNums.length > oldNums.length) {
                // Find the latest one (backend sorts by sequence or appends)
                // The numbers from backend are { number, sequence }
                const latest = newNums[newNums.length - 1];
                const numVal = latest?.number ?? latest;
                if (numVal) speakNumber(numVal);
             }
             
             return json;
          });
        }
      } catch (err) {
        // ignore
      }
    };

    poll(); // Initial fetch
    const intervalId = setInterval(poll, 3000); // Poll every 3s
    return () => clearInterval(intervalId);
  }, [isOpen, tenantId, gameId, speakNumber]);

  const isGameActive = state.status === "running" && !state.isPaused;
  const isGameCompleted = state.status === "completed";

  const handleToggleCallingStatus = async () => {
    if (!isTimeReached && state.status === "scheduled") {
      alert("Timer has not ended yet. Cannot start game.");
      return;
    }
    if (isGameCompleted) return;

    setLoadingAction(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;

      if (isGameActive) {
        // Currently ON, turn OFF (pause)
        await api.post(`/tenants/${tenantId}/games/${gameId}/pause`, undefined, { headers });
        setState(s => ({ ...s, isPaused: true }));
      } else {
        // Currently OFF, turn ON (run/resume)
        if (state.status === "scheduled") {
          // Update interval first if changed
          if (intervalSec !== initialInterval) {
             await api.patch(`/tenants/${tenantId}/games/${gameId}`, { callIntervalSeconds: intervalSec }, { headers });
          }
          await api.post(`/tenants/${tenantId}/games/${gameId}/run`, undefined, { headers });
          setState(s => ({ ...s, status: "running", isPaused: false }));
        } else if (state.status === "running" && state.isPaused) {
          await api.post(`/tenants/${tenantId}/games/${gameId}/resume`, undefined, { headers });
          setState(s => ({ ...s, isPaused: false }));
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to change calling status.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleIntervalChange = async (newVal: number) => {
    setIntervalSec(newVal);
    if (state.status === 'running') {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
        await api.post(
          `/tenants/${tenantId}/games/${gameId}/update-interval`,
          { intervalSeconds: newVal },
          { headers }
        );
      } catch (err) {
        console.error("Failed to update interval:", err);
      }
    }
  };

  const handleEndGame = async () => {
    if (isGameCompleted) return;
    if (!window.confirm("Are you sure you want to end this game completely? This action cannot be undone.")) {
      return;
    }

    setLoadingAction(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      
      await api.post(`/tenants/${tenantId}/games/${gameId}/stop`, undefined, { headers });
      setState(s => ({ ...s, status: "completed", isPaused: true }));
    } catch (err) {
      console.error(err);
      alert("Failed to end game.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleClose = async () => {
    if (isGameActive && !loadingAction) {
      setLoadingAction(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
        await api.post(`/tenants/${tenantId}/games/${gameId}/pause`, undefined, { headers });
        setState(s => ({ ...s, isPaused: true }));
      } catch (err) {
        console.error("Failed to auto-pause on close:", err);
      } finally {
        setLoadingAction(false);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  // Same order as the Dividend Settings screen (NewDividendsSection NEW_PATTERNS)
  const DIVIDEND_ORDER: Record<string, number> = {
    full_house_1:    0,
    full_house_2:    1,
    full_house_3:    2,
    full_sheet_bonus: 3,
    half_seat_bonus:  4,
    top_line:        5,
    middle_line:     6,
    bottom_line:     7,
    box_bonus:       8,
    corners:         9,
    star:           10,
    quick_five:     11,
    quick_six:      12,
    quick_seven:    13,
  };

  const sortedDividends = [...(state.dividends ?? [])].sort(
    (a, b) =>
      (DIVIDEND_ORDER[a.pattern_type] ?? 99) -
      (DIVIDEND_ORDER[b.pattern_type] ?? 99)
  );

  // Determine Subheader Text
  let subheaderText = countdown;
  if (isTimeReached && state.status === "scheduled") subheaderText = "GAME IS LIVE";
  if (state.status === "running") subheaderText = "GAME IS LIVE";
  if (state.status === "completed") subheaderText = "GAME ENDED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-[#0b00c4] w-full max-w-lg rounded-md overflow-hidden shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col relative border-2 border-blue-600">
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute right-2 top-2 bg-[#ff522b] hover:bg-red-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl leading-none z-10 shadow"
        >
          &times;
        </button>

        {/* Sound Toggle Button */}
        <button 
          onClick={toggleSound}
          className={`absolute left-2 top-2 w-8 h-8 rounded flex items-center justify-center font-bold text-sm leading-none z-10 shadow border
            ${isSoundEnabled ? 'bg-green-500 hover:bg-green-400 border-green-700 text-white' : 'bg-gray-500 hover:bg-gray-400 border-gray-700 text-white'}
          `}
          title={isSoundEnabled ? "Mute Sound" : "Enable Sound"}
        >
          {isSoundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Header */}
        <div className="flex flex-col justify-center items-center p-4 relative bg-[#0b00c4]">
          <h3 className="text-white font-black text-xl tracking-wide uppercase mb-2">
            RUN GAME
          </h3>
          <h4 className="text-white font-black text-lg tracking-wide uppercase">
            {subheaderText}
          </h4>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-4">
          
          {/* Controls Table */}
          <div className="border border-black bg-gray-200 mb-4">
            {/* Calling Status Row */}
            <div className="flex border-b border-black h-10">
              <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-sm uppercase">
                Calling Status
              </div>
              <div 
                onClick={(!isTimeReached && state.status === "scheduled") || isGameCompleted || loadingAction ? undefined : handleToggleCallingStatus}
                className={`w-20 sm:w-24 flex justify-center items-center font-bold text-black text-sm bg-white cursor-pointer select-none transition-colors
                  ${(!isTimeReached && state.status === "scheduled") || isGameCompleted || loadingAction ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
                  ${isGameActive ? 'text-green-600' : 'text-red-600'}
                `}
              >
                {loadingAction ? (
                  <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  isGameActive ? "ON" : "OFF"
                )}
              </div>
            </div>

            {/* Calling Interval Row */}
            <div className="flex h-10">
              <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-sm uppercase">
                Calling Interval
              </div>
              <div className="w-20 sm:w-24 flex justify-center items-center bg-white relative">
                <select 
                  value={intervalSec}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  disabled={loadingAction || isGameCompleted}
                  className="w-full h-full bg-transparent font-bold text-black text-center appearance-none outline-none cursor-pointer disabled:opacity-50"
                  style={{ textAlignLast: 'center' }}
                >
                  <option value={8}>8s</option>
                  <option value={10}>10s</option>
                  <option value={12}>12s</option>
                  <option value={15}>15s</option>
                </select>
                <div className="absolute right-2 pointer-events-none text-xs font-black">▼</div>
              </div>
            </div>

            {/* End Game Row */}
            <div className="flex border-t border-black h-10">
              <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-sm uppercase">
                End Game
              </div>
              <div 
                onClick={isGameCompleted || loadingAction ? undefined : handleEndGame}
                className={`w-20 sm:w-24 flex justify-center items-center font-bold text-sm select-none transition-colors
                  ${isGameCompleted || loadingAction ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500' : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'}
                `}
              >
                {loadingAction ? (
                  <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "END"
                )}
              </div>
            </div>
          </div>

          {/* Number Board */}
          <div className="bg-gray-300 p-2 sm:p-3 border-4 border-gray-400 rounded-sm mb-4">
            <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
              {Array.from({ length: 90 }, (_, i) => i + 1).map(num => {
                const isCalled = state.calledNumbers?.some((n: any) => (n.number || n) === num);
                return (
                  <div 
                    key={num}
                    className={`aspect-square flex items-center justify-center font-bold text-xs sm:text-sm md:text-base rounded-sm shadow-sm
                      ${isCalled ? 'bg-yellow-400 text-black border border-yellow-600' : 'bg-white text-black border border-gray-300'}
                    `}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dividends / Prizes List */}
          <div className="space-y-2">
            {sortedDividends.map(div => {
              const divWinners = state.winners?.filter(w => w.dividend_id === div.id) || [];
              const hasWinner = divWinners.length > 0;
              
              return (
                <div 
                  key={div.id}
                  className={`border-2 p-4 text-center ${
                    hasWinner 
                      ? "border-yellow-400 bg-yellow-500/20 text-yellow-300" 
                      : "border-white text-white"
                  }`}
                >
                  <h3 className="font-bold text-lg sm:text-xl md:text-2xl tracking-wide">
                    {div.name}
                  </h3>
                  {hasWinner && (
                    <div className="mt-2 text-xs sm:text-sm font-bold text-yellow-400 space-y-1">
                      {divWinners.map((w: any, idx: number) => (
                        <div key={w.id || idx} className="bg-yellow-500/10 p-1 rounded">
                          Ticket #{w.ticket_number || '?'} - {w.player_name || 'N/A'} {w.player_phone ? `(${w.player_phone})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
