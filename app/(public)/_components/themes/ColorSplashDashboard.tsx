"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Ticket, Game, Tenant, Dividend, GameStatus, GameState } from "@/types";
import CountdownTimer from "../CountdownTimer";
import { buildBookingWhatsAppUrl, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useGamePolling, type RealtimeCalledNumber, type RealtimeWinnerRow, type RealtimeGameRow } from "../../_hooks/useGamePolling";
import { useTambolaVoice } from "../../_hooks/useTambolaVoice";
import { fireCelebration, fireWinnerConfetti, playCelebrationSound } from "@/lib/celebration";
import { sortDividends } from "@/lib/sortDividends";
import QuickBookModal from "../QuickBookModal";

interface ColorSplashDashboardProps {
  tenant: Tenant;
  game?: Game | null;
  tickets?: Ticket[];
  dividends?: Dividend[];
  gameState?: GameState | null;
  agents?: {id: string, name: string}[];
  sessionRole?: any;
}

/**
 * A highly visual, lightweight "Casino Slot Machine" scramble effect for the called number.
 * It rapidly scrambles random numbers for 1.5 seconds before snapping to the actual called number,
 * simulating a slot machine roll.
 */
const CasinoSlotMachine = ({ targetNumber, animKey, onSpinComplete }: { targetNumber: number, animKey: number, onSpinComplete?: (n: number) => void }) => {
  const [displayNumber, setDisplayNumber] = useState<number | string>(targetNumber || '?');
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (!targetNumber) return;
    setIsSpinning(true);
    let duration = 1500; // 1.5 seconds spin time
    let start = Date.now();
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - start >= duration) {
        clearInterval(interval);
        setDisplayNumber(targetNumber);
        setIsSpinning(false);
        // Notify parent exactly when spin ends — drives voice + ticket cut
        onSpinComplete?.(targetNumber);
      } else {
        // Random number between 1 and 90 during the spin
        setDisplayNumber(Math.floor(Math.random() * 90) + 1);
      }
    }, 60);

    return () => clearInterval(interval);
  // animKey intentionally excluded: it was causing a double-spin.
  // Tambola numbers are unique (1-90), so targetNumber changing is sufficient to trigger a new spin.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  // Format as 2 digits for better slot machine feel (e.g. 05 instead of 5)
  const formattedDisplay = typeof displayNumber === 'number' && displayNumber < 10 ? `0${displayNumber}` : displayNumber;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300
        ${isSpinning 
          ? "bg-gradient-to-tr from-yellow-300 via-yellow-500 to-yellow-400 shadow-[0_0_60px_rgba(234,179,8,0.8)] scale-110 border-4 border-yellow-200" 
          : "bg-gradient-to-br from-[#eab308] to-[#ca8a04] shadow-[0_0_30px_rgba(234,179,8,0.4)] border-4 border-[#f0ecd8]/30 scale-100"}`}
      >
        <span className={`relative z-10 text-5xl sm:text-7xl font-black text-[#0c2e1c] leading-none tracking-tighter transition-all duration-75
          ${isSpinning ? 'opacity-70 blur-[1px] scale-y-125' : 'opacity-100 blur-none scale-y-100'}`}
        >
          {formattedDisplay}
        </span>
        
        {/* Inner shadow/glare for casino coin/token look */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_-10px_20px_rgba(0,0,0,0.3)] pointer-events-none"></div>
        <div className="absolute top-2 left-3 w-16 h-8 bg-white/30 rounded-full blur-md rotate-[-45deg] pointer-events-none"></div>
      </div>
      
      {!isSpinning && targetNumber && (
        <span className="text-yellow-500 font-bold text-xs sm:text-sm animate-bounce mt-2 shadow-black drop-shadow-md uppercase tracking-wider">
          New Number!
        </span>
      )}
    </div>
  );
};

export default function ColorSplashDashboard({
  tenant,
  game,
  tickets = [],
  dividends = [],
  gameState = null,
  agents = [],
}: ColorSplashDashboardProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // Menus state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAgentsMenu, setShowAgentsMenu] = useState(false);
  const [showQuickBook, setShowQuickBook] = useState(false);

  // ── Live game state ────────────────────────────────────────────────────────
  const [liveGame, setLiveGame] = useState<Game | null>(game ?? null);
  const [liveDividends, setLiveDividends] = useState<Dividend[]>(dividends || []);
  const [liveTickets, setLiveTickets] = useState<Ticket[]>(tickets || []);
  const [calledNumbers, setCalledNumbers] = useState<number[]>(gameState?.called_numbers || []);
  const [displayHistory, setDisplayHistory] = useState<number[]>(gameState?.called_numbers || []); // Delayed history for animation sync
  const [latestNumber, setLatestNumber] = useState<number | null>(gameState?.called_numbers?.at(-1) ?? null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(game?.status || 'scheduled');
  const [animKey, setAnimKey] = useState(0); // increment to re-trigger CSS animation
  const [winners, setWinners] = useState<RealtimeWinnerRow[]>((gameState?.winners as any[]) || []);
  const [latestWinner, setLatestWinner] = useState<RealtimeWinnerRow | null>(null);
  
  const { isSoundEnabled, toggleSound, speakNumber, speakAnnouncement, speakPrize } = useTambolaVoice();

  // Sync display history immediately when calledNumbers changes (spin callback already guarantees timing)
  useEffect(() => {
    setDisplayHistory(calledNumbers);
  }, [calledNumbers]);

  // ── Auto-transition to Live UI when timer ends ────────────────────────────
  const [hasTimeReached, setHasTimeReached] = useState(() => {
    return new Date().getTime() >= new Date(game?.scheduled_at || 0).getTime();
  });

  useEffect(() => {
    if (!game?.scheduled_at || hasTimeReached) return;
    const target = new Date(game.scheduled_at).getTime();
    const now = Date.now();
    if (now >= target) {
      setHasTimeReached(true);
      return;
    }
    const t = setTimeout(() => {
      setHasTimeReached(true);
      speakAnnouncement("game_about_to_start");
    }, target - now);
    return () => clearTimeout(t);
  }, [game?.scheduled_at, hasTimeReached, speakAnnouncement]);

  // Derived from gameStatus and time — declared here so all effects below can use it
  const isLive = gameStatus === 'running' || gameStatus === 'completed' || (gameStatus === 'scheduled' && hasTimeReached);

  // Sync game status when prop changes (e.g. server re-renders via router.refresh)
  useEffect(() => {
    if (game?.status) setGameStatus(game.status);
    if (game) setLiveGame(game);
    if (tickets) setLiveTickets(tickets);
    if (dividends) setLiveDividends(dividends);
  }, [game, tickets, dividends]);

  // Sync winners when server state updates via soft refresh
  useEffect(() => {
    if (gameState?.winners) {
      setWinners(prev => {
        const newWinners = gameState.winners as unknown as RealtimeWinnerRow[];
        if (newWinners.length !== prev.length) {
          setLatestWinner(newWinners[newWinners.length - 1] || null);
          return newWinners;
        }
        return prev;
      });
    }
  }, [gameState?.winners]);

  // Auto-clear winner announcement after 6 seconds
  useEffect(() => {
    if (!latestWinner) return;
    const t = setTimeout(() => setLatestWinner(null), 6000);
    return () => clearTimeout(t);
  }, [latestWinner]);

  // ── Spin complete callback ────────────────────────────────────────────────
  // Called by CasinoSlotMachine exactly when the 1.5s animation ends.
  // Drives voice and ticket cut so they are guaranteed to happen AFTER the spin.
  const handleSpinComplete = useCallback((num: number) => {
    speakNumber(num);
    setTimeout(() => {
      setCalledNumbers(prev => {
        if (prev.includes(num)) return prev;
        return [...prev, num];
      });
    }, 1500);
  }, [speakNumber]);

  // ── Realtime handlers ─────────────────────────────────────────────────────
  const handleCalledNumber = useCallback((payload: RealtimeCalledNumber) => {
    // Only trigger the spin — voice and ticket cut fire via handleSpinComplete
    setLatestNumber(payload.number);
    setAnimKey(k => k + 1);
  }, []);

  const handleNewWinner = useCallback((row: RealtimeWinnerRow) => {
    setWinners(prev => {
      if (prev.some(w => w.dividend_id === row.dividend_id && w.ticket_id === row.ticket_id)) {
        return prev;
      }
      return [...prev, row];
    });
    setLatestWinner(row);
    // Look up the pattern_type of the won prize and play the specific prize audio
    const dividend = liveDividends.find(d => d.id === row.dividend_id);
    speakPrize(dividend?.pattern_type || 'full_house_1');
    fireWinnerConfetti();
    setTimeout(() => setLatestWinner(null), 4000);
  }, [speakPrize, liveDividends]);

  const onGameStatusChange = useCallback((payload: any) => {
    const status = payload.status as GameStatus;
    setGameStatus(status);
    if (status === 'running') {
      speakAnnouncement("game_started");
    } else if (status === 'completed') {
      speakAnnouncement("game_ended");
      fireCelebration();
      playCelebrationSound();
    }
  }, [speakAnnouncement, fireCelebration, playCelebrationSound]);

  useGamePolling({
    tenantId: tenant.id,
    gameId: game?.id ?? '',
    onCalledNumber: handleCalledNumber,
    onNewWinner: handleNewWinner,
    onGameStatusChange,
    onTicketsUpdated: (newTickets) => {
      if (newTickets && newTickets.length > 0) {
        setLiveTickets(newTickets);
      }
    },
    onDividendsUpdated: (newDividends) => {
      if (newDividends && newDividends.length > 0) {
        setLiveDividends(newDividends);
      }
    },
    onGameUpdated: (newGame) => {
      if (!newGame) return;
      setLiveGame(prev => {
        if (!prev) return newGame as Game;
        if (prev.scheduled_at !== newGame.scheduled_at || prev.status !== newGame.status) {
          return { ...prev, ...newGame } as Game;
        }
        return prev;
      });
    },
    onGameReset: () => window.location.reload()
  });




  const ticketsPerPage = 20;

  const isMock = !liveGame;
  const displayGame = liveGame || {
    id: "mock-game",
    tenant_id: tenant.id,
    scheduled_at: "2025-05-24T20:00:00.000Z",
    ticket_price: 100,
    total_tickets: 500,
    status: "scheduled",
    booking_status: "open",
  };

  const displayTickets = isMock 
    ? Array.from({ length: 500 }, (_, i) => ({
        id: `mock-ticket-${i}`,
        game_id: "mock-game",
        ticket_number: i + 1,
        status: i < 248 ? "booked" : "available",
        grid: [
          [4, 18, 37, 46, 60, 72, 85, 0, 0],
          [11, 23, 32, 54, 63, 77, 88, 0, 0],
          [5, 20, 41, 56, 69, 83, 90, 0, 0]
        ],
        player_name: i < 248 ? "Player" : null,
      })) as unknown as Ticket[]
    : liveTickets;

  const bookedCount = displayTickets.filter((t) => t.status === "booked").length;
  const totalCount = displayGame.total_tickets;
  const availableCount = totalCount - bookedCount;

  // Show all tickets (no filter/search). Live view restricts to booked/confirmed only.
  const filteredTickets = displayTickets.filter(t => {
    if (isLive) {
      if (t.status !== 'booked' && t.status !== 'confirmed') return false;
    }
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage) || 1;
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ticketsPerPage);

  // Format the date dynamically
  const scheduledDate = new Date(displayGame.scheduled_at || new Date().toISOString());
  const formattedDate = scheduledDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }); // e.g. "Sat, 24 May 2025"
  
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }); // e.g. "08:00 PM"

  return (
    <div 
      className="w-full min-h-screen bg-[#0a0a1a] font-sans text-white pb-20 overflow-x-hidden"
    >
      
      {/* HEADER SECTION — Banner Image */}
      <div className="relative w-full">
        <img
          src="/images/color_splash_header.png"
          alt="JACKPOT TAMBOLA"
          className="w-full object-cover"
        />
        <div className="absolute top-[22%] sm:top-[25%] left-0 right-0 flex justify-center pointer-events-none">
          <h1 className="text-white font-bold text-[17px] sm:font-black sm:text-4xl md:text-5xl uppercase tracking-widest drop-shadow-xl" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            JACKPOT TAMBOLA
          </h1>
        </div>
        {tenant.is_bumper_game && (
          <div className="flex justify-center py-2 bg-[#0a0a1a]">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white font-bold text-sm tracking-widest uppercase shadow-[0_0_15px_rgba(225,29,72,0.6)] border border-red-300/50">
              🌟 BUMPER GAME 🌟
            </span>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-1 sm:px-6 pt-1 pb-2 space-y-2 sm:space-y-4">

        {/* NAV BUTTONS — Whatsapp / Telegram / Agent list / Call / Login */}
        <div className={`relative grid ${
          (tenant.whatsappActive ?? true) && (tenant.telegramActive === true && !!tenant.telegramLink) ? 'grid-cols-5' :
          (tenant.whatsappActive ?? true) || (tenant.telegramActive === true && !!tenant.telegramLink) ? 'grid-cols-4' :
          'grid-cols-3'
        } gap-1 sm:gap-1.5 pt-1 pb-2 w-full`}>

          {/* Whatsapp */}
          {(tenant.whatsappActive ?? true) && (
            <a
              href={buildWhatsAppUrl(tenant.whatsappNumber || tenant.ownerPhone || '', 'Hi, I want to inquire about the Tambola game.')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border-[3px] border-[#ffff00] text-white font-bold text-[13px] leading-none sm:text-[15px] py-1 px-0.5 rounded flex items-center justify-center text-center transition-all h-[34px] sm:h-10"
            >
              Whatsapp
            </a>
          )}

          {/* Telegram */}
          {tenant.telegramActive === true && tenant.telegramLink && (
            <a
              href={tenant.telegramLink.startsWith('http') ? tenant.telegramLink : `https://${tenant.telegramLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border-[3px] border-[#ffff00] text-white font-bold text-[13px] leading-none sm:text-[15px] py-1 px-0.5 rounded flex items-center justify-center text-center transition-all h-[34px] sm:h-10"
            >
              Telegram
            </a>
          )}

          {/* Agent list */}
          <div className="w-full">
            <button
              onClick={() => setShowAgentsMenu(!showAgentsMenu)}
              className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] border-[3px] border-[#ffff00] text-white font-bold text-[13px] leading-none sm:text-[15px] py-1 px-0.5 rounded flex items-center justify-center text-center transition-all h-[34px] sm:h-10"
            >
              Agent list
            </button>

            {showAgentsMenu && (
              <>
                <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowAgentsMenu(false)} />
                <div className="fixed top-12 left-4 right-4 sm:max-w-md sm:mx-auto bg-[#0000ed] border border-white/20 rounded shadow-2xl p-3 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-10 duration-200 min-h-[40vh]">
                  <div className="flex justify-end">
                    <button onClick={() => setShowAgentsMenu(false)} className="text-white font-bold text-xl leading-none hover:text-gray-300">X</button>
                  </div>
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh]">
                    {agents && agents.length > 0 ? (
                      agents.map(agent => (
                        <div key={agent.id} className="w-full border border-[#f5c518] rounded bg-[#0000ed] text-white font-bold py-2.5 text-center text-sm">
                          {agent.name}
                        </div>
                      ))
                    ) : (
                      <div className="w-full border border-[#f5c518] rounded bg-[#0000ed] text-white font-bold py-2.5 text-center text-sm">
                        No agents assigned
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Call */}
          <a
            href={`tel:${tenant.whatsappNumber || tenant.ownerPhone || ''}`}
            className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border-[3px] border-[#ffff00] text-white font-bold text-[13px] leading-none sm:text-[15px] py-1 px-0.5 rounded flex items-center justify-center text-center transition-all h-[34px] sm:h-10"
          >
            Call
          </a>

          {/* Login */}
          <div className="relative w-full">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] border-[3px] border-[#ffff00] text-white font-bold text-[13px] leading-none sm:text-[15px] py-1 px-0.5 rounded flex items-center justify-center text-center transition-all h-[34px] sm:h-10"
            >
              Login
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-40 bg-[#0000ed] rounded shadow-xl p-2.5 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-white font-bold text-base text-center leading-tight mb-1">
                    Select login<br/>type
                  </div>
                  <a
                    href="/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full bg-[#f0f0f0] text-[#111] text-center font-medium py-1.5 text-sm hover:bg-gray-200"
                  >
                    Login as admin
                  </a>
                  <a
                    href="/agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full bg-[#f0f0f0] text-[#111] text-center font-medium py-1.5 text-sm hover:bg-gray-200"
                  >
                    Login as agent
                  </a>
                  <button 
                    onClick={() => setShowProfileMenu(false)} 
                    className="text-white font-bold text-center text-sm mt-1 hover:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>


        {/* ═══════════════════════════════════════════════════════════════════
            CONDITIONAL: LIVE GAME VIEW vs BOOKING VIEW
        ════════════════════════════════════════════════════════════════════ */}

        {isLive && (
          <div className="space-y-5">

            {/* ── GAME STATUS banner ────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="flex items-center gap-2 bg-white border-2 border-pink-400 rounded-full px-5 py-2 shadow-lg">
                {/* Status dot */}
                {gameStatus === 'running' ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                  </span>
                ) : (
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
                  </span>
                )}
                <span className="text-sm sm:text-base font-black text-purple-800 tracking-[0.2em] uppercase">
                  {gameStatus === 'running' ? 'Game is Live' : gameStatus === 'scheduled' ? 'Game is about to start' : 'Game Ended'}
                </span>
                <span className={gameStatus === 'running' ? "text-pink-500 animate-pulse" : "text-slate-400"}>🎨</span>
              </div>
              {/*
              <p className="text-xs text-purple-800 font-bold">
                {calledNumbers.length} of 90 numbers called
              </p>
              */}

              {/* ── Recently Called Numbers Strip (Moved Below Number Board) ── */}
            </div>

            {/* ── Winner Announcement Toast ───────────────────────────────── */}
            {latestWinner && (
              <div className="w-full max-w-lg mx-auto flex items-center gap-3 bg-pink-100 border-2 border-pink-400 rounded-2xl px-4 py-3 animate-pulse shadow-xl">
                <span className="text-2xl drop-shadow-md">🏆</span>
                <div>
                  <p className="text-pink-600 font-black text-sm tracking-wide uppercase">Winner!</p>
                  <p className="text-purple-800 text-xs font-bold">
                    {(() => {
                      const t = tickets.find(t => t.id === latestWinner.ticket_id);
                      const tNo = t?.ticket_number || latestWinner.ticket_id?.slice(-6);
                      const tName = t?.player_name ? ` (${t.player_name})` : '';
                      return `Ticket No. ${tNo}${tName} won a prize!`;
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* ── Winners Summary ─────────────────────────────────────────── */}
            {/*
            winners.length > 0 && (
              <div className="w-full max-w-lg mx-auto bg-white rounded-xl border-2 border-pink-300 p-3 shadow-md">
                <p className="text-pink-600 text-[10px] font-bold uppercase tracking-widest mb-2">🏆 Winners ({winners.length})</p>
                <div className="space-y-1">
                  {winners.map((w, i) => {
                    const t = tickets.find(ticket => ticket.id === w.ticket_id);
                    const tNo = t?.ticket_number || w.ticket_id?.slice(-6);
                    const tName = t?.player_name ? ` (${t.player_name})` : '';
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-purple-800 font-bold">Ticket No. {tNo}{tName}</span>
                        <span className="text-pink-600 font-medium">{w.matched_numbers?.length} numbers matched</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
            */}


            {/* ── Casino Slot Machine Number Reveal ─────────────────────────────────── */}
            <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 border-2 border-pink-300 shadow-inner relative overflow-hidden"
              style={{ minHeight: '160px' }}
            >
              {/* subtle bg pattern */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ec4899 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

              {latestNumber ? (
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <p className="text-[10px] sm:text-xs font-bold text-purple-800 uppercase tracking-widest mb-2">Number Called</p>
                  <CasinoSlotMachine targetNumber={latestNumber} animKey={animKey} onSpinComplete={handleSpinComplete} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-60 relative z-10">
                  <div className="w-24 h-24 rounded-full border-4 border-dashed border-pink-400 flex items-center justify-center bg-white shadow-sm">
                    <span className="text-pink-500 text-3xl font-black">?</span>
                  </div>
                  <p className="text-xs text-purple-800 font-bold">Waiting for first number…</p>
                </div>
              )}
            </div>

            {/* ── 1–90 Number Grid ──────────────────────────────────────── */}
            <div className="rounded-xl bg-white p-4 shadow-lg border-2 border-pink-300">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black text-purple-800 uppercase tracking-widest">Number Board</h3>
                <div className="flex items-center gap-3 text-[10px] font-bold text-pink-600">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-pink-500 inline-block"></span>Called</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#fcf0f5] border border-pink-200 inline-block"></span>Not yet</span>
                </div>
              </div>

              <div className="grid grid-cols-9 sm:grid-cols-10 gap-1 sm:gap-1.5">
                {Array.from({ length: 90 }, (_, i) => i + 1).map(n => {
                  const isCalled = calledNumbers.includes(n);
                  const isLatest = calledNumbers.length > 0 && n === calledNumbers[calledNumbers.length - 1];
                  return (
                    <div
                      key={n}
                      className={[
                        'aspect-square flex items-center justify-center rounded-md text-[10px] sm:text-xs font-black transition-all duration-300',
                        isLatest
                          ? 'bg-yellow-400 text-black shadow-lg scale-110 z-10 relative number-pop border border-yellow-300'
                          : isCalled
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'bg-[#fcf0f5] text-purple-400 border border-pink-200',
                      ].join(' ')}
                      aria-label={`${n}${isCalled ? ' called' : ''}`}
                    >
                      {n}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Recently Called Numbers Strip ──────────────────────────── */}
            {displayHistory.length > 0 && (
              <div className="w-full bg-white rounded-xl border-2 border-pink-300 p-2.5 -mt-2 sm:-mt-3 mb-2 shadow-md relative z-10">
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  {displayHistory.slice().reverse().map((n, i) => (
                    <div 
                      key={i} 
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black shadow-sm text-xs sm:text-sm transition-all ${
                        i === 0 
                          ? "bg-pink-500 text-white ring-2 ring-pink-300 scale-110 shadow-lg" 
                          : "bg-purple-100 text-purple-800 opacity-80"
                      }`}
                      title={`Called ${i === 0 ? 'just now' : i + ' turns ago'}`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Prize Columns (Live Game) ────────────────────────────── */}
            <div className="mt-8 mb-4">
              <h3 className="text-sm font-black text-white bg-pink-500 uppercase tracking-widest text-center mb-4 border-2 border-pink-600 py-2 rounded-lg shadow-md mx-auto max-w-[200px]">Prize List</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortDividends(liveDividends.filter(d => d.is_active)).map((prize, idx) => {
                  const prizeWinners = winners.filter(w => w.dividend_id === prize.id);
                  return (
                    <div key={prize.id || idx} className="bg-white border-2 border-pink-300 rounded-xl p-3 flex flex-col shadow-sm">
                      <div className="flex justify-between items-center border-b-2 border-pink-100 pb-2 mb-2">
                        <span className="text-purple-800 font-bold text-xs sm:text-sm uppercase">{prize.name}</span>
                        <span className="text-pink-600 font-black text-xs bg-pink-50 px-2 py-0.5 rounded-full">₹{prize.prize_amount?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex-1">
                        {prizeWinners.length > 0 ? (
                          <div className="space-y-1">
                            {prizeWinners.map((w, i) => (
                              <div key={i} className="flex items-center gap-2 bg-pink-50 p-2 rounded-lg border border-pink-200">
                                <span className="text-lg">🏆</span>
                                <div className="flex flex-col">
                                  <span className="text-purple-800 font-bold text-xs">
                                    {(() => {
                                      const t = tickets.find(ticket => ticket.id === w.ticket_id);
                                      const tNo = t?.ticket_number || w.ticket_id?.slice(-6) || w.ticket_id;
                                      const tName = t?.player_name ? ` (${t.player_name})` : '';
                                      return `Ticket No. ${tNo}${tName}`;
                                    })()}
                                  </span>
                                  <span className="text-pink-600 font-medium text-[10px]">{w.matched_numbers?.length} matched</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full py-4 opacity-60">
                            <span className="text-purple-400 text-xs font-bold">Waiting for winner...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {!isLive && (
          <>
            {/* CHECK AVAILABLE TICKET — Red bold heading button */}
            <button
              onClick={() => setShowQuickBook(true)}
              className="w-full text-center pt-5 pb-2"
            >
              <span className="text-red-600 font-black text-xl sm:text-2xl uppercase tracking-wide">
                CHECK AVAILABLE TICKET
              </span>
            </button>

            {/* COUNTDOWN TIMER — dark section with yellow-bordered boxes */}
            <div className="w-full bg-[#0a0a1a] py-3">
              {/* Labels row */}
              <div className="grid grid-cols-3 gap-0.5 text-center mb-2 px-0.5">
                <div className="text-white font-bold text-xs tracking-widest">Hours</div>
                <div className="text-white font-bold text-xs tracking-widest">Minutes</div>
                <div className="text-white font-bold text-xs tracking-widest">Seconds</div>
              </div>
              {/* Number boxes row */}
              <div className="grid grid-cols-3 gap-0.5 px-0.5">
                <CountdownTimer
                  targetDate={displayGame.scheduled_at || new Date().toISOString()}
                  variant="boxes"
                  numberClassName="bg-[#f5f5e0] border-2 border-[#f5c518] rounded text-xs sm:text-sm font-bold text-gray-900 py-1.5 flex items-center justify-center w-full"
                />
              </div>
              {/* DATE & TIME display boxes */}
              <div className="grid grid-cols-2 gap-0.5 px-0.5 mt-0.5">
                <div className="bg-[#1a1a1a] border-2 border-[#f5c518] rounded text-xs sm:text-sm font-bold text-white py-1.5 flex items-center justify-center text-center w-full">
                  <span>{formattedDate}</span>
                </div>
                <div className="bg-[#1a1a1a] border-2 border-[#f5c518] rounded text-xs sm:text-sm font-bold text-white py-1.5 flex items-center justify-center text-center w-full">
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>


        {/* PRIZE LIST (Commented out as requested) 
        <div className="rounded-xl bg-[#eef0e5] shadow-lg relative p-4 border-2 border-pink-300">
          <div className="flex justify-center mb-5 relative">
            <div className="bg-pink-500 text-white px-8 py-1.5 rounded-full font-bold tracking-widest text-sm flex items-center gap-2 shadow-md">
              <span className="text-green-400">🌿</span> PRIZE LIST <span className="text-green-400">🌿</span>
            </div>
          </div>
          
          <div className="flex flex-row items-center gap-4">
            <div className="w-24 h-32 sm:w-40 sm:h-40 shrink-0 relative flex items-center justify-center bg-gradient-to-b from-pink-100 to-transparent rounded-lg border-2 border-pink-300">
              <span className="text-6xl sm:text-7xl drop-shadow-md">🏆</span>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center justify-between border-b-2 border-pink-300 pb-2 mb-2">
                <span className="text-purple-800 text-sm sm:text-base font-black uppercase tracking-wider">Ticket Price</span>
                <span className="text-white font-black text-sm bg-pink-500 px-3 py-1 rounded-full shadow-sm">₹{displayGame.ticket_price}</span>
              </div>
              {sortDividends(liveDividends.filter(d => d.is_active)).map((prize, index) => {
                const colors = ['bg-yellow-500 text-black', 'bg-slate-300 text-black', 'bg-orange-500 text-white', 'bg-green-600 text-white', 'bg-blue-600 text-white'];
                return (
                <div key={prize.id || index} className="flex items-center justify-between border-b border-[#c2bda2] pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${colors[index%5] || 'bg-pink-500 text-white'} flex items-center justify-center text-xs font-bold shadow-md border border-white`}>
                      {index + 1}
                    </div>
                    <span className="text-purple-800 text-xs sm:text-sm font-semibold">{prize.name}</span>
                  </div>
                  <span className="text-purple-800 font-black text-sm sm:text-base">₹{prize.prize_amount?.toLocaleString('en-IN')}</span>
                </div>
              )})}
              {dividends.filter(d => d.is_active).length === 0 && (
                <div className="text-center text-[#2a4d3a] text-sm py-4">No active prizes</div>
              )}
            </div>
          </div>
        </div>
        */}

        {/* LAST GAME WINNERS (Hidden for now until there is past game data) */}
        {/* 
        <div className="rounded-xl bg-[#f0ecd8] p-3 shadow-lg relative border border-[#e2dcc3]">
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[#143a24] text-xs">→</span>
              <span className="text-yellow-500 text-sm">🏆</span>
              <h3 className="text-[#143a24] font-black tracking-widest text-xs uppercase">Last Game Winners</h3>
              <span className="text-[#143a24] text-xs">←</span>
            </div>
          </div>
          
          <div className="flex flex-row justify-between gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex flex-col items-center justify-center text-center gap-1 min-w-[30%] bg-white/50 rounded-lg p-2 border border-[#d8d3b8]">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs shadow-md border-2 border-white">1</div>
              <p className="text-[10px] font-black text-[#0c2e1c] mt-1 truncate w-full">Rina Das</p>
              <p className="text-[9px] text-[#4a6b57] font-medium">Ticket No. A-125</p>
              <p className="text-[11px] font-black text-[#0c2e1c]">₹10,000</p>
            </div>
            
            <div className="flex flex-col items-center justify-center text-center gap-1 min-w-[30%] bg-white/50 rounded-lg p-2 border border-[#d8d3b8]">
              <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-black font-bold text-xs shadow-md border-2 border-white">2</div>
              <p className="text-[10px] font-black text-[#0c2e1c] mt-1 truncate w-full">Manoj Saikia</p>
              <p className="text-[9px] text-[#4a6b57] font-medium">Ticket No. B-067</p>
              <p className="text-[11px] font-black text-[#0c2e1c]">₹5,000</p>
            </div>
            
            <div className="flex flex-col items-center justify-center text-center gap-1 min-w-[30%] bg-white/50 rounded-lg p-2 border border-[#d8d3b8]">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white">3</div>
              <p className="text-[10px] font-black text-[#0c2e1c] mt-1 truncate w-full">Pooja Saikia</p>
              <p className="text-[9px] text-[#4a6b57] font-medium">Ticket No. C-032</p>
              <p className="text-[11px] font-black text-[#0c2e1c]">₹3,000</p>
            </div>
          </div>
        </div>
        */}
          </>
        )}

        {/* TICKETS SECTION */}
        <div className="mt-8 sm:mt-10 space-y-3 px-4 sm:px-0">

          {/* Ticket grid list */}
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 pb-20">
            {paginatedTickets.map((ticket) => (
              <RealTicketCard
                key={ticket.id}
                ticket={ticket}
                isLive={isLive}
                calledNumbers={displayHistory}
                isRetired={winners.some(w => w.ticket_id === ticket.id)}
                whatsappNumber={tenant.whatsappNumber || ''}
                gameDate={displayGame.scheduled_at || null}
                ticketPrice={displayGame.ticket_price || 0}
                businessName={tenant.businessName}
              />
            ))}
            {paginatedTickets.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400 font-bold">
                No tickets found.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-[#143a24] text-white rounded-md font-bold disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <span className="text-[#eab308] font-bold text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-[#143a24] text-white rounded-md font-bold disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Quick Book Modal */}
      {showQuickBook && (
        <QuickBookModal
          tickets={displayTickets}
          whatsappNumber={tenant.whatsappNumber || ''}
          gameDate={displayGame.scheduled_at || null}
          ticketPrice={displayGame.ticket_price || 0}
          businessName={tenant.businessName || ''}
          onClose={() => setShowQuickBook(false)}
        />
      )}


    </div>
  );
}

// Custom Ticket Card — matches screenshot design
function RealTicketCard({
  ticket,
  isLive = false,
  isRetired = false,
  calledNumbers = [],
  whatsappNumber = '',
  gameDate = null,
  ticketPrice = 0,
  businessName = '',
}: {
  ticket: Ticket;
  isLive?: boolean;
  isRetired?: boolean;
  calledNumbers?: number[];
  whatsappNumber?: string;
  gameDate?: string | null;
  ticketPrice?: number;
  businessName?: string;
}) {
  const isBooked = ticket.status === "booked" || ticket.status === "confirmed";

  const handleBookThis = () => {
    const url = buildBookingWhatsAppUrl({
      whatsappNumber,
      ticketNumbers: [ticket.ticket_number],
      gameDate,
      ticketPrice,
      businessName,
    });
    window.open(url, '_blank');
  };

  // Format: "1:(Player Name)" — or "1:(UNSOLD)" if no player
  const headerLabel = `${ticket.ticket_number}:(${ticket.player_name || 'UNSOLD'})`;

  return (
    <div className={`relative flex flex-col transition-all ${isRetired ? 'opacity-60 grayscale' : ''}`}>
      {isRetired && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="bg-red-600/90 text-white font-black text-xl sm:text-2xl tracking-widest px-10 py-1 sm:py-2 transform -rotate-12 border-y-4 border-white shadow-2xl uppercase whitespace-nowrap">
            WON
          </div>
        </div>
      )}

      {/* Header row — blue background */}
      <div className="flex justify-between items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-[#4a72ff] rounded-t border border-blue-400/30">
        <span className="text-white font-bold text-[14px] sm:text-[16px] truncate pr-2">
          {headerLabel}
        </span>
        <div className="shrink-0">
          {isLive ? null : isBooked ? (
            <span className="text-white font-black text-[12px] sm:text-[14px] tracking-wider uppercase drop-shadow-sm">
              BOOKED
            </span>
          ) : (
            <button
              onClick={handleBookThis}
              className="text-white font-black text-[12px] sm:text-[14px] tracking-wider uppercase hover:text-gray-200 transition-colors drop-shadow-sm"
            >
              Book This
            </button>
          )}
        </div>
      </div>

      {/* Grid body — white background with thick yellow border */}
      <div className="bg-white border-[4px] border-[#f5a623] rounded-b-md overflow-hidden shadow-sm">
        {(ticket.grid || []).map((row, i) => (
          <div key={i} className="flex w-full border-b border-gray-300 last:border-0">
            {row.map((num, j) => {
              const isCut = isLive && num !== 0 && calledNumbers.includes(num);
              return (
                <div
                  key={j}
                  className={`relative flex-1 text-center py-1 font-black border-r border-gray-300 last:border-0 text-xs sm:text-sm h-9 sm:h-10 flex items-center justify-center text-black ${isCut ? 'bg-yellow-300' : ''}`}
                >
                  {num === 0 ? "" : (
                    <>
                      {num}
                      {isCut && (
                         <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-[120%] h-[2px] bg-red-600 -rotate-12 rounded-full shadow-sm origin-center transform scale-110"></div>
                         </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

