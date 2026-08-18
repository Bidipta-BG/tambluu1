"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Ticket, Game, Tenant, Dividend, GameStatus, GameState } from "@/types";
import CountdownTimer from "../CountdownTimer";
import { buildBookingWhatsAppUrl, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useGamePolling, type RealtimeCalledNumber, type RealtimeWinnerRow, type RealtimeGameRow } from "../../_hooks/useGamePolling";
import { useTambolaVoice } from "../../_hooks/useTambolaVoice";
import { fireCelebration, fireWinnerConfetti, playCelebrationSound } from "@/lib/celebration";

interface NortheastDashboardProps {
  tenant: Tenant;
  game?: Game | null;
  tickets?: Ticket[];
  dividends?: Dividend[];
  gameState?: GameState | null;
  sessionRole?: any;
}

/**
 * A highly visual, lightweight "Casino Slot Machine" scramble effect for the called number.
 * It rapidly scrambles random numbers for 1.5 seconds before snapping to the actual called number,
 * simulating a slot machine roll.
 */
const CasinoSlotMachine = ({ targetNumber, animKey }: { targetNumber: number, animKey: number }) => {
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
      } else {
        // Random number between 1 and 90 during the spin
        setDisplayNumber(Math.floor(Math.random() * 90) + 1);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [targetNumber, animKey]);

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

export default function NortheastDashboard({
  tenant,
  game,
  tickets = [],
  dividends = [],
  gameState = null,
}: NortheastDashboardProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'booked' | 'available'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Multi-select state
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  
  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ── Live game state ────────────────────────────────────────────────────────
  const [liveGame, setLiveGame] = useState<Game | null>(game ?? null);
  const [liveTickets, setLiveTickets] = useState<Ticket[]>(tickets || []);
  const [liveDividends, setLiveDividends] = useState<Dividend[]>(dividends || []);
  const [calledNumbers, setCalledNumbers] = useState<number[]>(gameState?.called_numbers || []);
  const [displayHistory, setDisplayHistory] = useState<number[]>(gameState?.called_numbers || []); // Delayed history for animation sync
  const [latestNumber, setLatestNumber] = useState<number | null>(gameState?.called_numbers?.at(-1) ?? null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(game?.status || 'scheduled');
  const [animKey, setAnimKey] = useState(0); // increment to re-trigger CSS animation
  const [winners, setWinners] = useState<RealtimeWinnerRow[]>((gameState?.winners as any[]) || []);
  const [latestWinner, setLatestWinner] = useState<RealtimeWinnerRow | null>(null);
  
  const { isSoundEnabled, toggleSound, speakNumber, speakAnnouncement } = useTambolaVoice();

  // Sync display history with a delay to let the slot machine animation finish first
  useEffect(() => {
    if (calledNumbers.length === displayHistory.length + 1) {
      const t = setTimeout(() => setDisplayHistory(calledNumbers), 1500); // 1.5s slot machine spin duration
      return () => clearTimeout(t);
    } else {
      setDisplayHistory(calledNumbers);
    }
  }, [calledNumbers]);

  // Derived from gameStatus — declared here so all effects below can use it
  const isLive = gameStatus === 'running' || gameStatus === 'completed';

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
        const newWinners = gameState.winners as RealtimeWinnerRow[];
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

  // Realtime handlers
  const onCalledNumber = useCallback((payload: RealtimeCalledNumber) => {
    const num = payload.number;
    if (num == null) return;
    setCalledNumbers(prev => prev.includes(num) ? prev : [...prev, num]);
    setLatestNumber(num);
    setAnimKey(k => k + 1);
    
    // Speak the number AFTER the slot machine animation finishes (1.5s)
    setTimeout(() => speakNumber(num), 1500);

    // GUARANTEED FALLBACK: Soft refresh the server component to pull the absolute
    // latest game state (including winners) via the secure backend query.
    // This perfectly bypasses any WebSocket drops or Row Level Security issues.
    router.refresh();
  }, [router, speakNumber]);

  const onNewWinner = useCallback((row: RealtimeWinnerRow) => {
    setWinners(prev => prev.some(w => w.ticket_id === row.ticket_id && w.dividend_id === row.dividend_id) ? prev : [...prev, row]);
    setLatestWinner(row);
    speakAnnouncement("We have a winner! Congratulations!");
    fireWinnerConfetti();
  }, [speakAnnouncement]);

  const onGameStatusChange = useCallback((payload: any) => {
    const status = payload.status as GameStatus;
    setGameStatus(status);
    if (status === 'running') {
      speakAnnouncement("The game has started! Good luck everyone!");
    } else if (status === 'completed') {
      speakAnnouncement("The game has ended! Thank you for playing!");
      fireCelebration();
      playCelebrationSound();
    }
  }, [speakAnnouncement, fireCelebration, playCelebrationSound]);

  useGamePolling({
    tenantId: tenant.id,
    gameId: game?.id ?? '',
    onCalledNumber,
    onNewWinner,
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
    }
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

  // Filter logic
  const filteredTickets = displayTickets.filter(t => {
    if (isLive) {
      if (t.status !== 'booked' && t.status !== 'confirmed') return false;
    } else {
      if (filter !== 'all' && t.status !== filter) return false;
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = t.ticket_number.toString() === q;
      const matchName = t.player_name?.toLowerCase().includes(q);
      const matchPhone = t.player_phone?.toLowerCase().includes(q);
      if (!matchNumber && !matchName && !matchPhone) return false;
    }
    
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage) || 1;
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ticketsPerPage);

  // Format the date dynamically
  const scheduledDate = new Date(displayGame.scheduled_at);
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
    <div className="w-full min-h-screen bg-gradient-to-b from-[#1a3c2a] via-[#0d2a1b] to-[#0a1f13] font-sans text-white pb-20 overflow-x-hidden">
      
      {/* HEADER SECTION — always visible */}
      <div className="relative w-full pt-10 pb-6 px-4 flex flex-col items-center">
        {/* Decorative elements - using CSS to mimic the bamboo/tribal patterns */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* Small top banner */}
        <div className="relative z-10 bg-[#163725] border border-[#205234] rounded-full px-4 py-1 mb-2">
          <span className="text-[9px] sm:text-[10px] font-bold text-[#f1e5c3] tracking-widest uppercase">Northeast Essence</span>
        </div>
        
        {/* Title */}
        <h1 className="relative z-10 text-4xl sm:text-6xl font-serif font-black text-[#f1e5c3] tracking-wider text-center drop-shadow-md uppercase">
          {tenant.businessName.split('.')[0]}
        </h1>
        
        {/* Subtitle */}
        <div className="relative z-10 flex items-center justify-center gap-2 mt-2 w-full max-w-xs">
          <div className="h-[1px] flex-1 bg-[#eab308]"></div>
          <span className="text-yellow-500 text-xs">🌿</span>
          <p className="text-[11px] sm:text-xs font-bold text-[#f0ecd8]">Play Together, Win Together</p>
          <span className="text-yellow-500 text-xs">🌿</span>
          <div className="h-[1px] flex-1 bg-[#eab308]"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 space-y-4">
        
        {/* Quick Action Icons */}
        <div className="flex justify-center items-center gap-4 py-2">
          {/* Call Icon */}
          <a href={`tel:${tenant.whatsappNumber || ''}`} className="bg-[#143a24] hover:bg-[#1e4e31] p-3 rounded-full border border-[#205234] text-yellow-500 shadow-md transition-all inline-flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </a>
          
          {/* WhatsApp Icon */}
          <a href={buildWhatsAppUrl(tenant.whatsappNumber || '', 'Hi, I want to inquire about the Tambola game.')} target="_blank" rel="noopener noreferrer" className="bg-[#143a24] hover:bg-[#1e4e31] p-3 rounded-full border border-[#205234] text-[#25D366] shadow-md transition-all inline-flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          </a>
          
          {/* Sound Toggle Icon */}
          <button 
            onClick={toggleSound}
            className="bg-[#143a24] hover:bg-[#1e4e31] p-3 rounded-full border border-[#205234] text-yellow-500 shadow-md transition-all flex items-center justify-center relative group"
            title={isSoundEnabled ? "Mute" : "Enable Sound"}
          >
            {isSoundEnabled ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.898a9 9 0 010 12.728M15 12H9l-4 4H4V8h1l4 4h6z"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            )}
            
            {!isSoundEnabled && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>

          {/* User Profile Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="bg-[#143a24] hover:bg-[#1e4e31] p-3 rounded-full border border-[#205234] text-yellow-500 shadow-md transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </button>
            
            {showProfileMenu && (
              <>
                {/* Invisible overlay to close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)}
                ></div>
                
                <div className="absolute top-full right-0 sm:-right-4 mt-2 w-48 bg-[#0c2e1c] border border-[#205234] rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <a 
                    href="/admin" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-3 text-sm text-[#f0ecd8] hover:bg-[#143a24] hover:text-yellow-500 font-bold transition-colors border-b border-[#205234]"
                  >
                    Login as an Admin
                  </a>
                  <a 
                    href="/agent" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-3 text-sm text-[#f0ecd8] hover:bg-[#143a24] hover:text-yellow-500 font-bold transition-colors"
                  >
                    Login as an Agent
                  </a>
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
              <div className="flex items-center gap-2 bg-[#143a24] border border-[#eab308]/40 rounded-full px-5 py-2 shadow-lg">
                {/* Status dot */}
                {gameStatus === 'running' ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                ) : (
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
                  </span>
                )}
                <span className="text-sm sm:text-base font-black text-[#f0ecd8] tracking-[0.2em] uppercase">
                  {gameStatus === 'running' ? 'Game is Live' : 'Game Ended'}
                </span>
                <span className={gameStatus === 'running' ? "text-yellow-500 animate-pulse" : "text-slate-400"}>🌿</span>
              </div>
              <p className="text-xs text-[#a0c4a0] font-medium">
                {calledNumbers.length} of 90 numbers called
              </p>

              {/* ── Recently Called Numbers Strip ──────────────────────────── */}
              {displayHistory.length > 0 && (
                <div className="w-full max-w-lg mx-auto bg-[#143a24]/50 rounded-xl border border-[#205234] p-3 mt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#a0c4a0] text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap px-2 w-full text-center mb-1">
                      History
                    </span>
                    {/* Show most recently called numbers first */}
                    {displayHistory.slice().reverse().map((n, i) => (
                      <div 
                        key={i} 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black shadow-sm text-xs sm:text-sm transition-all ${
                          i === 0 
                            ? "bg-yellow-500 text-[#0c2e1c] ring-2 ring-yellow-300 scale-110" 
                            : "bg-[#205234] text-[#f0ecd8] opacity-80"
                        }`}
                        title={`Called ${i === 0 ? 'just now' : i + ' turns ago'}`}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Winner Announcement Toast ───────────────────────────────── */}
            {latestWinner && (
              <div className="w-full max-w-lg mx-auto flex items-center gap-3 bg-[#eab308]/15 border border-[#eab308]/50 rounded-2xl px-4 py-3 animate-pulse shadow-lg">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-[#eab308] font-black text-sm tracking-wide uppercase">Winner!</p>
                  <p className="text-[#f0ecd8] text-xs font-medium">
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
            {winners.length > 0 && (
              <div className="w-full max-w-lg mx-auto bg-[#143a24]/50 rounded-xl border border-[#eab308]/20 p-3">
                <p className="text-[#eab308] text-[10px] font-bold uppercase tracking-widest mb-2">🏆 Winners ({winners.length})</p>
                <div className="space-y-1">
                  {winners.map((w, i) => {
                    const t = tickets.find(ticket => ticket.id === w.ticket_id);
                    const tNo = t?.ticket_number || w.ticket_id?.slice(-6);
                    const tName = t?.player_name ? ` (${t.player_name})` : '';
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-[#f0ecd8] font-medium">Ticket No. {tNo}{tName}</span>
                        <span className="text-[#a0c4a0]">{w.matched_numbers?.length} numbers matched</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* ── Casino Slot Machine Number Reveal ─────────────────────────────────── */}
            <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-[#0a2416] border border-[#205234] shadow-inner relative overflow-hidden"
              style={{ minHeight: '160px' }}
            >
              {/* subtle bg pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

              {latestNumber ? (
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <p className="text-[10px] sm:text-xs font-bold text-[#a0c4a0] uppercase tracking-widest mb-2">Number Called</p>
                  <CasinoSlotMachine targetNumber={latestNumber} animKey={animKey} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-50 relative z-10">
                  <div className="w-24 h-24 rounded-full border-4 border-dashed border-[#205234] flex items-center justify-center">
                    <span className="text-[#205234] text-3xl font-black">?</span>
                  </div>
                  <p className="text-xs text-[#4a7a5a] font-medium">Waiting for first number…</p>
                </div>
              )}
            </div>

            {/* ── 1–90 Number Grid ──────────────────────────────────────── */}
            <div className="rounded-xl bg-[#f0ecd8] p-4 shadow-lg border border-[#e2dcc3]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black text-[#0c2e1c] uppercase tracking-widest">Number Board</h3>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-[#5a7a6a]">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#eab308] inline-block"></span>Called</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#143a24] inline-block"></span>Not yet</span>
                </div>
              </div>

              <div className="grid grid-cols-9 sm:grid-cols-10 gap-1 sm:gap-1.5">
                {Array.from({ length: 90 }, (_, i) => i + 1).map(n => {
                  const isCalled = calledNumbers.includes(n);
                  const isLatest = n === latestNumber;
                  return (
                    <div
                      key={n}
                      className={[
                        'aspect-square flex items-center justify-center rounded-md text-[10px] sm:text-xs font-bold transition-all duration-300',
                        isLatest
                          ? 'bg-[#eab308] text-[#0c2e1c] shadow-[0_0_12px_rgba(234,179,8,0.7)] scale-110 z-10 relative number-pop'
                          : isCalled
                          ? 'bg-[#143a24] text-[#f0ecd8] shadow-sm'
                          : 'bg-[#d8d3b8] text-[#5a6a5a]',
                      ].join(' ')}
                      aria-label={`${n}${isCalled ? ' called' : ''}`}
                    >
                      {n}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Prize Columns (Live Game) ────────────────────────────── */}
            <div className="mt-8 mb-4">
              <h3 className="text-sm font-black text-yellow-500 uppercase tracking-widest text-center mb-4 border-b border-[#205234] pb-2">Prize List</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {liveDividends.filter(d => d.is_active).map((prize, idx) => {
                  const prizeWinners = winners.filter(w => w.dividend_id === prize.id);
                  return (
                    <div key={prize.id || idx} className="bg-[#143a24]/50 border border-[#205234] rounded-xl p-3 flex flex-col">
                      <div className="flex justify-between items-center border-b border-[#205234] pb-2 mb-2">
                        <span className="text-[#eab308] font-bold text-xs sm:text-sm uppercase">{prize.name}</span>
                        <span className="text-[#a0c4a0] font-black text-xs">₹{prize.prize_amount?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex-1">
                        {prizeWinners.length > 0 ? (
                          <div className="space-y-1">
                            {prizeWinners.map((w, i) => (
                              <div key={i} className="flex items-center gap-2 bg-[#0c2e1c] p-2 rounded-lg border border-[#205234]">
                                <span className="text-lg">🏆</span>
                                <div className="flex flex-col">
                                  <span className="text-[#f0ecd8] font-bold text-xs">
                                    {(() => {
                                      const t = tickets.find(ticket => ticket.id === w.ticket_id);
                                      const tNo = t?.ticket_number || w.ticket_id?.slice(-6) || w.ticket_id;
                                      const tName = t?.player_name ? ` (${t.player_name})` : '';
                                      return `Ticket No. ${tNo}${tName}`;
                                    })()}
                                  </span>
                                  <span className="text-[#a0c4a0] text-[10px]">{w.matched_numbers?.length} matched</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full py-4 opacity-50">
                            <span className="text-[#a0c4a0] text-xs font-medium">Waiting for winner...</span>
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
        {/* STATS BAR (Cream colored card) */}
        <div className="flex items-center justify-between rounded-xl bg-[#eef0e5] p-3 shadow-lg border-2 border-[#163725]">
          <div className="flex flex-col flex-1 items-center justify-center border-r-2 border-[#163725]/20 px-1 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-[#163725] flex items-center justify-center gap-1"><span className="text-xl">📅</span> Game Starts</span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#163725] mt-1">{formattedDate}</span>
            <span className="text-sm font-black text-[#163725] mt-0.5">{formattedTime}</span>
          </div>
          
          <div className="flex flex-col flex-1 items-center justify-center border-r-2 border-[#163725]/20 px-1 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-[#163725] flex items-center justify-center gap-1"><span className="text-xl">⏱</span> Starts In</span>
            <CountdownTimer
              targetDate={displayGame.scheduled_at}
              className="text-lg font-black text-[#163725] tracking-wide mt-1"
            />
          </div>
          
          <div className="flex flex-col flex-1 items-center justify-center px-1 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-[#163725] flex items-center justify-center gap-1"><span className="text-xl">🎟</span> Tickets Bought</span>
            <span className="text-sm font-black text-[#163725] mt-1">
              {bookedCount} / {totalCount}
            </span>
          </div>
        </div>

        {/* PRIZE LIST */}
        <div className="rounded-xl bg-[#eef0e5] shadow-lg relative p-4 border-2 border-[#163725]">
          <div className="flex justify-center mb-5 relative">
            <div className="bg-[#163725] text-white px-8 py-1.5 rounded-full font-bold tracking-widest text-sm flex items-center gap-2 shadow-md">
              <span className="text-green-400">🌿</span> PRIZE LIST <span className="text-green-400">🌿</span>
            </div>
          </div>
          
          <div className="flex flex-row items-center gap-4">
            {/* Trophy Placeholder */}
            <div className="w-24 h-32 sm:w-40 sm:h-40 shrink-0 relative flex items-center justify-center bg-gradient-to-b from-[#d8dfc4] to-transparent rounded-lg border-2 border-[#163725]">
              <span className="text-6xl sm:text-7xl drop-shadow-md">🏆</span>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#163725] pb-2 mb-2">
                <span className="text-[#163725] text-sm sm:text-base font-black uppercase tracking-wider">Ticket Price</span>
                <span className="text-white font-black text-sm bg-[#163725] px-3 py-1 rounded-full shadow-sm">₹{displayGame.ticket_price}</span>
              </div>
              {liveDividends.filter(d => d.is_active).map((prize, index) => {
                const colors = ['bg-yellow-500 text-black', 'bg-slate-300 text-black', 'bg-orange-500 text-white', 'bg-green-600 text-white', 'bg-blue-600 text-white'];
                return (
                <div key={prize.id || index} className="flex items-center justify-between border-b border-[#c2bda2] pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${colors[index%5] || 'bg-[#163725] text-white'} flex items-center justify-center text-xs font-bold shadow-md border border-white`}>
                      {index + 1}
                    </div>
                    <span className="text-[#163725] text-xs sm:text-sm font-semibold">{prize.name}</span>
                  </div>
                  <span className="text-[#163725] font-black text-sm sm:text-base">₹{prize.prize_amount?.toLocaleString('en-IN')}</span>
                </div>
              )})}
              {dividends.filter(d => d.is_active).length === 0 && (
                <div className="text-center text-[#2a4d3a] text-sm py-4">No active prizes</div>
              )}
            </div>
          </div>
        </div>

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
        <div className="pt-2 border-2 border-[#163725] bg-[#0d2a1b] rounded-xl p-3 shadow-inner mt-4">
          {/* Banner */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 text-sm">🎟</span>
              <h3 className="text-yellow-500 font-bold tracking-widest text-xs uppercase">{isLive ? "Live Tickets" : "Tickets For Coming Game"}</h3>
              <span className="text-green-400 text-sm">🌿</span>
            </div>
          </div>
          
          {/* Tabs */}
          {!isLive && (
          <div className="flex w-full gap-1 mb-4">
            <button 
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
              className={`flex-1 font-bold py-2 rounded-t text-[9px] sm:text-xs tracking-tight border-t-2 border-x-2 border-b-2 border-[#163725] ${filter === 'all' ? 'bg-[#163725] text-white shadow-md' : 'bg-[#eef0e5] text-[#163725]'}`}
            >
              ALL TICKETS ({totalCount})
            </button>
            <button 
              onClick={() => { setFilter('booked'); setCurrentPage(1); }}
              className={`flex-1 font-bold py-2 rounded-t text-[9px] sm:text-xs tracking-tight border-t-2 border-x-2 border-b-2 border-[#163725] ${filter === 'booked' ? 'bg-[#163725] text-white shadow-md' : 'bg-[#eef0e5] text-[#163725]'}`}
            >
              TICKETS SOLD ({bookedCount})
            </button>
            <button 
              onClick={() => { setFilter('available'); setCurrentPage(1); }}
              className={`flex-1 font-bold py-2 rounded-t text-[9px] sm:text-xs tracking-tight border-t-2 border-x-2 border-b-2 border-[#163725] ${filter === 'available' ? 'bg-[#163725] text-white shadow-md' : 'bg-[#eef0e5] text-[#163725]'}`}
            >
              AVAILABLE ({availableCount})
            </button>
          </div>
          )}

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by ticket no, name, or phone..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0a2617] border border-[#143a24] rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-[#4a6b57] focus:outline-none focus:border-[#1e4e31]"
            />
          </div>
          
          {/* Ticket grid list */}
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 pb-20">
            {paginatedTickets.map((ticket) => (
              <RealTicketCard 
                key={ticket.id} 
                ticket={ticket}
                isLive={isLive}
                calledNumbers={calledNumbers}
                isRetired={winners.some(w => w.ticket_id === ticket.id)}
                isSelected={selectedTickets.includes(ticket.ticket_number)}
                onToggleSelect={() => {
                  if (selectedTickets.includes(ticket.ticket_number)) {
                    setSelectedTickets(prev => prev.filter(t => t !== ticket.ticket_number));
                  } else {
                    if (selectedTickets.length >= 6) {
                      alert("You can select up to 6 tickets at a time.");
                      return;
                    }
                    setSelectedTickets(prev => [...prev, ticket.ticket_number]);
                  }
                }}
              />
            ))}
            {paginatedTickets.length === 0 && (
              <div className="col-span-full py-8 text-center text-[#a3b8ad] font-bold">
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

      {/* Floating Action Bar for WhatsApp Booking — only in booking mode */}
      {!isLive && selectedTickets.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-10 flex justify-center pointer-events-none">
          <div className="bg-[#143a24] text-[#f0ecd8] p-3 sm:p-4 rounded-xl shadow-2xl border-2 border-[#eab308] flex items-center justify-between gap-4 sm:gap-8 w-full max-w-lg pointer-events-auto">
            <div>
              <p className="text-xs text-[#a3b8ad] font-bold uppercase tracking-wider">Selected Tickets</p>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="font-black text-lg text-white leading-none">{selectedTickets.length} <span className="text-sm font-normal text-[#a3b8ad]">/ 6 Max</span></p>
                <button 
                  onClick={() => setSelectedTickets([])} 
                  className="bg-[#0a2617] text-[#a3b8ad] hover:text-white hover:bg-red-500/80 rounded-full p-1 transition-all" 
                  title="Clear selection"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                const url = buildBookingWhatsAppUrl({
                  whatsappNumber: tenant.whatsappNumber || "",
                  ticketNumbers: selectedTickets,
                  gameDate: game?.scheduled_at || null,
                  ticketPrice: game?.ticket_price || 0,
                  businessName: tenant.businessName,
                });
                window.open(url, '_blank');
              }}
              className="bg-[#25D366] hover:bg-[#1ebd5a] text-white font-extrabold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span>Book via WhatsApp</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Custom Ticket Card mapping real 3x9 grid
function RealTicketCard({ 
  ticket, 
  isSelected,
  onToggleSelect,
  isLive = false,
  isRetired = false,
  calledNumbers = []
}: { 
  ticket: Ticket; 
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isLive?: boolean;
  isRetired?: boolean;
  calledNumbers?: number[];
}) {
  const isBooked = ticket.status === "booked" || ticket.status === "confirmed";
  
  return (
    <div className={`relative rounded-xl overflow-hidden border-2 shadow-lg transition-all ${isSelected ? 'border-yellow-400 bg-yellow-50' : 'border-[#163725] bg-[#faf8f0]'} ${isBooked && !isLive ? 'opacity-90' : ''} ${isRetired ? 'opacity-60 grayscale' : ''}`}>
      {isRetired && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="bg-red-600/90 text-white font-black text-xl sm:text-2xl tracking-widest px-10 py-1 sm:py-2 transform -rotate-12 border-y-4 border-white shadow-2xl uppercase whitespace-nowrap">
            WON
          </div>
        </div>
      )}
      <div className={`flex justify-between items-center px-4 py-2 border-b-2 transition-colors ${isSelected ? 'border-yellow-200 bg-yellow-100' : 'border-[#163725] bg-[#faf8f0]'}`}>
        <div className="flex items-center gap-1.5 truncate pr-2 w-full">
          <span className="text-[#163725] font-black text-xs sm:text-sm tracking-wide shrink-0">Ticket No. {ticket.ticket_number}</span>
          {isBooked && ticket.player_name && (
            <span className="text-[#163725] font-bold text-[10px] sm:text-xs truncate w-full">
              • {ticket.player_name}
            </span>
          )}
          {!isBooked && (
            <span className="text-[#163725] font-bold text-[10px] sm:text-xs truncate w-full">
              • Unbooked
            </span>
          )}
        </div>
        {!isLive && (
          <div className="flex items-center gap-2 shrink-0">
            {isBooked ? (
              <>
                <span className="bg-[#16a34a] text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider">BOOKED</span>
              </>
            ) : (
              <>
                {onToggleSelect ? (
                  <button 
                    onClick={onToggleSelect}
                    className={`text-[9px] font-bold px-3 py-1 rounded shadow transition-colors border-2 ${isSelected ? 'bg-yellow-500 text-[#163725] border-yellow-500' : 'bg-[#d97706] hover:bg-amber-700 text-white border-transparent'}`}
                  >
                    {isSelected ? 'SELECTED' : 'SELECT'}
                  </button>
                ) : (
                  <span className="bg-[#d97706] text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider">AVAILABLE</span>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="p-0">
        <div className={`overflow-hidden transition-colors`}>
          {(ticket.grid || []).map((row, i) => (
            <div key={i} className={`flex w-full border-b-2 last:border-0 transition-colors ${isSelected ? 'border-yellow-200' : 'border-[#163725]'}`}>
              {row.map((num, j) => {
                const isCut = isLive && num !== 0 && calledNumbers.includes(num);
                return (
                  <div key={j} className={`relative flex-1 text-center py-1 font-black border-r-2 last:border-0 text-xs sm:text-base h-7 sm:h-9 flex items-center justify-center transition-colors ${
                    isSelected 
                      ? 'border-yellow-200 text-[#1e4e31]' 
                      : 'border-[#163725] text-[#163725]'
                  } ${isCut ? 'bg-yellow-200/50 text-[#0c2e1c]' : ''}`}>
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
    </div>
  );
}

