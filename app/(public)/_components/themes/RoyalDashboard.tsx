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

interface RoyalDashboardProps {
  tenant: Tenant;
  game?: Game | null;
  tickets?: Ticket[];
  dividends?: Dividend[];
  gameState?: GameState | null;
  agents?: {id: string, name: string}[];
  sessionRole?: any;
}


export default function RoyalDashboard({
  tenant,
  game,
  tickets = [],
  dividends = [],
  gameState = null,
  agents = [],
}: RoyalDashboardProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // Menus state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAgentsMenu, setShowAgentsMenu] = useState(false);
  const [showQuickBook, setShowQuickBook] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedDividend, setSelectedDividend] = useState<any | null>(null);
  const [dismissedTicketIds, setDismissedTicketIds] = useState<Set<string>>(new Set());
  const [pinnedTicketIds, setPinnedTicketIds] = useState<string[]>([]);
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
  const [latestWinnerGroup, setLatestWinnerGroup] = useState<RealtimeWinnerRow[] | null>(null);
  
  const { isSoundEnabled, toggleSound, speakNumber, speakAnnouncement, speakPrize } = useTambolaVoice();

  // Sync display history immediately when calledNumbers changes (spin callback already guarantees timing)
  useEffect(() => {
    setDisplayHistory(calledNumbers);
  }, [calledNumbers]);

  // ── Auto-transition to Live UI when timer ends ────────────────────────────
  const [hasTimeReached, setHasTimeReached] = useState(() => {
    return new Date().getTime() >= new Date(game?.scheduled_at || 0).getTime();
  });

  const hasMounted = useRef(false);

  // Reactively reset the countdown whenever liveGame.scheduled_at changes.
  // This handles the case where the admin reschedules the game to a future time
  // after the original timer has already expired (hasTimeReached was true).
  // Depending only on scheduled_at avoids the one-way latch problem.
  useEffect(() => {
    const targetDate = liveGame?.scheduled_at || game?.scheduled_at;
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();
    const now = Date.now();
    if (now >= target) {
      setHasTimeReached(true);
      return;
    }
    // New time is in the future — reset the latch so the countdown reappears
    setHasTimeReached(false);
    
    // Play sound when timer is set in the future (only on updates, not initial load)
    if (hasMounted.current) {
      speakAnnouncement("please_book_ticket");
    }
    hasMounted.current = true;

    const t = setTimeout(() => {
      setHasTimeReached(true);
      speakAnnouncement("game_about_to_start");
    }, target - now);
    return () => clearTimeout(t);
  }, [liveGame?.scheduled_at, speakAnnouncement]);

  // Derived from gameStatus and time — declared here so all effects below can use it
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
        const newWinners = gameState.winners as unknown as RealtimeWinnerRow[];
        if (newWinners.length !== prev.length) {
          setLatestWinnerGroup(newWinners.length > 0 ? [newWinners[newWinners.length - 1]] : null);
          return newWinners;
        }
        return prev;
      });
    }
  }, [gameState?.winners]);

  // Auto-clear winner announcement after 6 seconds
  useEffect(() => {
    if (!latestWinnerGroup) return;
    const t = setTimeout(() => setLatestWinnerGroup(null), 6000);
    return () => clearTimeout(t);
  }, [latestWinnerGroup]);

  // ── Realtime handlers ─────────────────────────────────────────────────────
  const handleCalledNumber = useCallback((payload: RealtimeCalledNumber) => {
    setLatestNumber(payload.number);
    setAnimKey(k => k + 1); // trigger CSS bounce on the yellow circle
    speakNumber(payload.number);
    
    setCalledNumbers(prev => {
      if (prev.includes(payload.number)) return prev;
      return [...prev, payload.number];
    });
  }, [speakNumber]);

  const handleNewWinner = useCallback((rows: RealtimeWinnerRow[]) => {
    if (!rows || rows.length === 0) return;
    setWinners(prev => {
      const next = [...prev];
      let changed = false;
      rows.forEach(row => {
        if (!next.some(w => w.dividend_id === row.dividend_id && w.ticket_id === row.ticket_id)) {
          next.push(row);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setLatestWinnerGroup(rows);
    // Look up the pattern_type of the won prize and play the specific prize audio
    const dividend = liveDividends.find(d => d.id === rows[0].dividend_id);
    speakPrize(dividend?.pattern_type || 'full_house_1');
    fireWinnerConfetti();
    setTimeout(() => setLatestWinnerGroup(null), 4000);
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
    if (submittedSearch) {
      const q = submittedSearch.toLowerCase();
      const matchNumber = String(t.ticket_number).includes(q);
      const matchName = t.player_name?.toLowerCase().includes(q);
      const matchPhone = t.player_phone?.toLowerCase().includes(q);
      if (!matchNumber && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const searchResults = pinnedTicketIds
    .map(id => displayTickets.find(t => t.id === id))
    .filter(t => t && !dismissedTicketIds.has(t.id)) as Ticket[];

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
          alt={(tenant.gameName ?? "JACKPOT TAMBOLA").toUpperCase()}
          className="w-full object-cover"
        />
        <div className="absolute top-[22%] sm:top-[25%] left-0 right-0 flex flex-col items-center justify-center pointer-events-none">
          <h1 className="text-white font-bold text-[17px] sm:font-black sm:text-4xl md:text-5xl uppercase tracking-widest drop-shadow-xl" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            {(tenant.gameName ?? "JACKPOT TAMBOLA").toUpperCase()}
          </h1>
          
          {/* Latest Number Yellow Circle Popup */}
          {hasTimeReached && latestNumber && gameStatus !== 'completed' && (
            <div 
              key={animKey}
              className="mt-1 sm:mt-2 w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-[#fbbc05] border-[2px] sm:border-[4px] border-[#4285f4] flex justify-center items-center shadow-[0_0_15px_rgba(251,188,5,0.8)] animate-bounce relative z-20"
            >
              <span className="text-black font-black text-lg sm:text-3xl">{latestNumber}</span>
            </div>
          )}
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




            {/* CHECK AVAILABLE TICKET — Red bold heading button */}
            {!hasTimeReached && (
              <button
                onClick={() => setShowQuickBook(true)}
                className="w-full text-center pt-5 pb-2"
              >
                <span className="text-red-600 font-black text-xl sm:text-2xl uppercase tracking-wide">
                  CHECK AVAILABLE TICKET
                </span>
              </button>
            )}

            {/* COUNTDOWN TIMER — dark section with yellow-bordered boxes */}
            <div className={`w-full bg-[#0a0a1a] pb-3 ${hasTimeReached ? '!mt-0 pt-1' : 'pt-3'}`}>
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

            {hasTimeReached && (
              <div className="w-full bg-[#0a0a1a] flex flex-col items-center justify-center pb-4 pt-2 -mt-1">
                <span className="text-[#ff0000] font-bold text-3xl sm:text-4xl uppercase tracking-wide drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                  {gameStatus === 'completed' ? 'GAME IS OVER' : 'GAME IS LIVE'}
                </span>
              </div>
            )}

            {/* Waiting/Live state - Number Board and Search */}
            {hasTimeReached && (
              <div className="w-full bg-[#0a0a1a] py-4 mt-2">
                <div className="grid grid-cols-10 gap-1 px-1 sm:gap-[6px] sm:px-[6px] max-w-3xl mx-auto w-full mb-6">
                  {Array.from({ length: 90 }, (_, i) => i + 1).map(n => {
                    const isCalled = calledNumbers.includes(n);
                    return (
                      <div
                        key={n}
                        className={`aspect-[10/9] flex items-center justify-center font-black border sm:border-[2px] border-[#ff4d4d] text-[10px] sm:text-xs ${
                          isCalled ? 'bg-[#0a0a1a] text-white' : 'bg-[#f5f5f5] text-black'
                        }`}
                      >
                        {n}
                      </div>
                    );
                  })}
                </div>

                {/* Recently Called Numbers Strip */}
                {displayHistory.length > 0 && (
                  <div className="w-full flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 mb-6 px-2">
                    {displayHistory.slice().reverse().map((n, i) => (
                      <div 
                        key={i} 
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black shadow-sm text-xs sm:text-sm bg-[#ffb6c1] text-black"
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                )}


                <div className="flex flex-col items-center gap-3 px-2 pb-4">
                  <input 
                    type="text" 
                    placeholder="Enter keyword" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[90%] max-w-[280px] px-4 py-1.5 bg-white text-black rounded font-medium outline-none text-center"
                  />
                  <button 
                    onClick={() => {
                      setSubmittedSearch(searchQuery);
                      const q = searchQuery.toLowerCase().trim();
                      if (!q) return;

                      const matchingTickets = displayTickets.filter(t => {
                        if (t.status !== 'booked' && t.status !== 'confirmed') return false;
                        const matchNumber = String(t.ticket_number).includes(q);
                        const matchName = t.player_name?.toLowerCase().includes(q);
                        const matchPhone = t.player_phone?.toLowerCase().includes(q);
                        const allGridNums = t.grid.flat().filter(n => n > 0).map(String);
                        const matchGrid = allGridNums.some(n => n.includes(q));
                        return matchNumber || matchName || matchPhone || matchGrid;
                      });

                      if (matchingTickets.length > 0) {
                        setPinnedTicketIds(prev => {
                          const newIds = [...prev];
                          let added = false;
                          matchingTickets.forEach(t => {
                            if (!newIds.includes(t.id)) {
                              newIds.push(t.id);
                              added = true;
                            }
                          });
                          return added ? newIds : prev;
                        });
                        // Remove these newly searched tickets from the dismissed list if they were previously dismissed
                        setDismissedTicketIds(prev => {
                          const newDismissed = new Set(prev);
                          let removed = false;
                          matchingTickets.forEach(t => {
                            if (newDismissed.has(t.id)) {
                              newDismissed.delete(t.id);
                              removed = true;
                            }
                          });
                          return removed ? newDismissed : prev;
                        });
                      }
                      setSearchQuery(""); // Optional: clear input after search so it's ready for the next one
                    }}
                    className="w-[85%] max-w-[220px] bg-[#ff0000] text-white font-black text-sm py-1.5 rounded shadow-md uppercase tracking-wider"
                  >
                    SEARCH
                  </button>
                </div>

                {/* Inline Search Results for Live Game */}
                {searchResults.length > 0 && (
                  <div className="w-full flex flex-col gap-4 px-2 pb-6 mt-2 max-w-sm mx-auto">
                    {searchResults.map(ticket => (
                      <SearchTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        calledNumbers={calledNumbers}
                        onClear={() => setDismissedTicketIds(prev => {
                          const next = new Set(prev);
                          next.add(ticket.id);
                          return next;
                        })}
                      />
                    ))}
                  </div>
                )}

                {/* DIVIDENT LIST */}
                <div className="w-full mt-2">
                  <h3 className="text-white font-bold text-center mb-4 tracking-wide text-lg sm:text-xl">DIVIDENT LIST</h3>
                  <div className="flex flex-col w-full">
                    {sortDividends(liveDividends.filter(d => d.is_active)).map((prize) => {
                      const prizeWinners = winners.filter(w => w.dividend_id === prize.id);
                      // Collect all unique winning tickets
                      const winnerTickets = prizeWinners
                        .map(w => tickets.find(t => t.id === w.ticket_id))
                        .filter(Boolean);
                      // Deduplicate by ticket id
                      const uniqueWinnerTickets = winnerTickets.filter((t, i, arr) => 
                        arr.findIndex(u => u!.id === t!.id) === i
                      );

                      return (
                        <div key={prize.id} className="w-full flex flex-col">
                          <div className="w-full bg-[#f89828] py-3 flex justify-center items-center border-b border-[#0a0a1a]/20">
                            <span className="text-black font-black text-lg sm:text-xl tracking-wide">{prize.name}</span>
                          </div>
                          {uniqueWinnerTickets.length > 0 && (
                            <div className="w-full bg-[#11007a] py-2 px-3 flex flex-col items-center gap-1">
                              {uniqueWinnerTickets.map(t => (
                                <span key={t!.id} className="text-white text-base sm:text-lg font-bold">
                                  TNO:{t!.ticket_number} ({t!.player_name || 'Unknown'})
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="w-full bg-[#11007a] py-3 flex justify-center items-center border-b-[2px] border-[#0a0a1a]">
                            <button 
                              className="bg-[#f5146c] text-white font-black text-sm sm:text-base px-16 py-1.5 rounded shadow-sm uppercase tracking-widest"
                              onClick={() => setSelectedDividend(prize)}
                            >
                              VIEW
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {liveDividends.filter(d => d.is_active).length === 0 && (
                      <div className="text-center text-slate-400 py-4 font-bold text-sm">
                        No active dividends
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}


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
        {/* TICKETS SECTION (Only shown before game starts) */}
        {!hasTimeReached && (
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
        )}

      </div>

      {/* Dividend Winner Modal */}
      {selectedDividend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#072169] border-2 border-[#13007a] w-full max-w-md rounded-md shadow-2xl relative max-h-[90vh] overflow-y-auto overflow-x-hidden p-4">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedDividend(null)}
              className="absolute top-2 right-4 text-white hover:text-gray-300 text-2xl font-normal"
            >
              X
            </button>

            {(() => {
              const prizeWinners = winners.filter(w => w.dividend_id === selectedDividend.id);
              
              if (prizeWinners.length === 0) {
                return (
                  <div className="flex justify-center items-center h-32 mt-4">
                    <span className="text-white font-black text-3xl uppercase">N/A</span>
                  </div>
                );
              }

              const isSheetBonus = selectedDividend.name.toLowerCase().includes('sheet');
              void isSheetBonus; // no longer used — kept to avoid breaking any future reference

              // Each winner row from the backend contains exactly the tickets that won.
              // Use ticket_id from each winner row directly — the source of truth.
              // This ensures sheet bonuses show only the 3 (half) or 6 (full) winning tickets,
              // not all tickets belonging to the player.
              const allEntries: { ticket: any; matchedNumbers: number[]; wonAt: number | null }[] = [];

              prizeWinners.forEach(w => {
                const winningTicket = tickets.find(t => t.id === w.ticket_id);
                if (!winningTicket) return;

                // Calculate WON AT: the last called number in this row's matched_numbers
                let wonAt: number | null = null;
                let maxIdx = -1;
                (w.matched_numbers || []).forEach(n => {
                  const idx = calledNumbers.indexOf(n);
                  if (idx > maxIdx) { maxIdx = idx; wonAt = n; }
                });

                if (!allEntries.find(e => e.ticket.id === winningTicket.id)) {
                  allEntries.push({ ticket: winningTicket, matchedNumbers: w.matched_numbers || [], wonAt });
                }
              });

              // Group entries by wonAt for "WON AT X" headings
              const wonAtValues = Array.from(new Set(allEntries.map(e => e.wonAt)));

              return wonAtValues.map((wonAt, groupIdx) => {
                const groupEntries = allEntries.filter(e => e.wonAt === wonAt);
                return (
                  <div key={groupIdx} className="mb-6 mt-4">
                    {wonAt !== null && wonAt !== undefined && (
                      <h2 className="text-white font-black text-xl sm:text-2xl text-center mb-4 tracking-wide">
                        WON AT {wonAt}
                      </h2>
                    )}
                    
                    <div className="space-y-4">
                      {groupEntries.map(({ ticket: t, matchedNumbers }, tIdx) => (
                        <div key={t.id || tIdx} className="flex flex-col w-full">
                          {/* Header */}
                          <div className="bg-[#9e0c66] text-white flex justify-between items-center px-2 py-1 text-xs font-bold rounded-t-sm">
                            <span className="truncate max-w-[60%]">{t.player_name || 'Unknown'}</span>
                            <span className="shrink-0">WINNER</span>
                          </div>
                          {/* Grid — use matchedNumbers (won-at-the-time) not calledNumbers */}
                          <div className="border-[3px] border-[#9e0c66] bg-[#072169] p-1 pb-1.5 rounded-b-sm">
                            <div className="grid grid-cols-9 gap-1">
                              {t.grid.map((row: number[], rIdx: number) => 
                                row.map((cell: number, cIdx: number) => {
                                  const isCut = cell > 0 && matchedNumbers.includes(cell);
                                  return (
                                    <div 
                                      key={`${rIdx}-${cIdx}`} 
                                      className={`aspect-square flex justify-center items-center font-bold text-[10px] sm:text-xs ${
                                        cell === 0 ? 'bg-white' 
                                        : isCut ? 'bg-[#9e0c66] text-black' 
                                        : 'bg-[#fff8d6] text-black'
                                      }`}
                                    >
                                      {cell > 0 ? cell : ''}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

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

function SearchTicketCard({
  ticket,
  calledNumbers = [],
  onClear
}: {
  ticket: Ticket;
  calledNumbers?: number[];
  onClear: () => void;
}) {
  const headerLabel = `${ticket.ticket_number} by ${ticket.player_name || 'UNSOLD'}`;

  return (
    <div className="flex flex-col w-full max-w-sm mx-auto shadow-xl">
      {/* Header row */}
      <div className="flex justify-between items-center px-2 py-1 bg-[#9e0c66] rounded-t-sm">
        <span className="text-white font-bold text-sm truncate pr-2">
          {headerLabel}
        </span>
        <button
          onClick={onClear}
          className="text-white font-bold text-xs tracking-wider uppercase bg-[#c2185b] px-2 py-0.5 rounded shadow-sm border border-white/20 active:scale-95 transition-transform"
        >
          CLEAR
        </button>
      </div>

      {/* Grid body — thick yellow border */}
      <div className="bg-[#fff8d6] border-[3px] border-[#f5a623] rounded-b-sm overflow-hidden p-1">
        <div className="grid grid-cols-9 gap-1">
          {ticket.grid.map((row: number[], rIdx: number) =>
            row.map((cell: number, cIdx: number) => {
              const isCut = cell > 0 && calledNumbers.includes(cell);
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`aspect-square flex justify-center items-center font-bold text-xs ${
                    cell === 0 ? 'bg-white'
                    : isCut ? 'bg-[#9e0c66] text-white'
                    : 'bg-[#fff8d6] text-black'
                  }`}
                >
                  {cell > 0 ? cell : ''}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
