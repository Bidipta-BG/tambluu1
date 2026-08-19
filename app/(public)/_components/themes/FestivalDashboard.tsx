"use client";

import { useState, useEffect } from "react";
import type { Ticket, Game, Tenant, Dividend } from "@/types";
import TicketCard from "../TicketCard";
import CountdownTimer from "../CountdownTimer";
import { buildBookingWhatsAppUrl, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useGamePolling, type RealtimeCalledNumber, type RealtimeWinnerRow, type RealtimeGameRow } from "../../_hooks/useGamePolling";
import { useTambolaVoice } from "../../_hooks/useTambolaVoice";
import { fireCelebration, fireWinnerConfetti, playCelebrationSound } from "@/lib/celebration";

interface BookingDashboardProps {
  tenant: Tenant;
  game?: Game | null;
  tickets?: Ticket[];
  dividends?: Dividend[];
  gameState?: any;
  agents?: {id: string, name: string}[];
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
        <span className={`relative z-10 text-5xl sm:text-7xl font-black text-black leading-none tracking-tighter transition-all duration-75
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

export default function FestivalDashboard({
  tenant,
  game,
  tickets = [],
  dividends = [],
  gameState = null,
  agents = [],
}: BookingDashboardProps) {
  const [liveGame, setLiveGame] = useState<Game | null>(game ?? null);
  const [filter, setFilter] = useState<'all' | 'booked' | 'available'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [gameStatus, setGameStatus] = useState(game?.status || 'scheduled');

  // Live Game State
  const [calledNumbers, setCalledNumbers] = useState<number[]>(gameState?.called_numbers || []);
  const [displayHistory, setDisplayHistory] = useState<number[]>(gameState?.called_numbers || []); 
  const [winners, setWinners] = useState<any[]>(gameState?.winners || []);
  const [latestWinner, setLatestWinner] = useState<any | null>(gameState?.winners?.at(-1) || null);
  const [animKey, setAnimKey] = useState(0);
  const [liveTickets, setLiveTickets] = useState<Ticket[]>(tickets || []);
  const [liveDividends, setLiveDividends] = useState<Dividend[]>(dividends || []);

  const { isSoundEnabled, toggleSound, speakNumber, speakAnnouncement } = useTambolaVoice();

  const isLive = gameStatus === 'running' || gameStatus === 'completed';
  const latestNumber = displayHistory[displayHistory.length - 1];

  useEffect(() => {
    if (calledNumbers.length === displayHistory.length + 1) {
      const t = setTimeout(() => setDisplayHistory(calledNumbers), 1500); 
      return () => clearTimeout(t);
    } else {
      setDisplayHistory(calledNumbers);
    }
  }, [calledNumbers]);

  useEffect(() => {
    if (game?.status) setGameStatus(game.status);
    if (game) setLiveGame(game);
    if (tickets) setLiveTickets(tickets);
    if (dividends) setLiveDividends(dividends);
  }, [game, tickets, dividends]);

  useGamePolling({
    tenantId: tenant.id,
    gameId: game?.id || "",
    onCalledNumber: (payload: RealtimeCalledNumber) => {
      const num = payload.number;
      if (num == null) return;
      setAnimKey(prev => prev + 1);
      setCalledNumbers(prev => prev.includes(num) ? prev : [...prev, num]);
      
      // Wait for the slot machine to finish before speaking
      setTimeout(() => {
        speakNumber(num);
      }, 1500);
    },
    onNewWinner: (row: RealtimeWinnerRow) => {
      setWinners(prev => {
        if (prev.some(w => w.dividend_id === row.dividend_id && w.ticket_id === row.ticket_id)) {
          return prev;
        }
        return [...prev, row];
      });
      setLatestWinner(row);
      setTimeout(() => setLatestWinner(null), 8000);
      speakAnnouncement("We have a winner! Congratulations!");
      fireWinnerConfetti();
    },
    onGameStatusChange: (payload: any) => {
      const status = payload.status as typeof gameStatus;
      setGameStatus(status);
      if (status === 'running') {
        speakAnnouncement("The game has started! Good luck everyone!");
      } else if (status === 'completed') {
        speakAnnouncement("The game has ended! Thank you for playing!");
        fireCelebration();
        playCelebrationSound();
      }
    },
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
  
  // Multi-select state
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  
  // Menus state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAgentsMenu, setShowAgentsMenu] = useState(false);

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
      className="w-full min-h-screen bg-cover bg-center bg-fixed font-sans text-white pb-20 overflow-x-hidden"
      style={{ backgroundImage: "url('/images/festival.jpg')" }}
    >
      
      {/* HEADER SECTION (Mobile exact layout) */}
      <div className="relative w-full pt-6 pb-6 px-4 border-b border-amber-900/50 bg-[#090114] flex flex-col items-center">
        
        {/* 1,2,3 Circles */}
        <div className="relative z-10 flex items-center justify-center mt-2 mb-2">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center text-[10px] font-bold border border-yellow-200 shadow-[0_0_8px_#facc15]">1</div>
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold border border-orange-300 shadow-[0_0_8px_#f97316]">2</div>
            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold border border-purple-400 shadow-[0_0_8px_#a855f7]">3</div>
          </div>
        </div>
        
        {/* Title */}
        <h1 className="relative z-10 text-3xl sm:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 tracking-wide text-center uppercase">
          {tenant.businessName.split('.')[0]}
        </h1>
        
        {/* Subtitle */}
        <div className="relative z-10 flex items-center justify-center gap-3 mt-1 w-full max-w-xs">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500"></div>
          <div className="w-2 h-2 rotate-45 border border-amber-500"></div>
          <p className="text-[10px] sm:text-xs font-semibold text-white tracking-widest uppercase">Play Together, Win Together</p>
          <div className="w-2 h-2 rotate-45 border border-amber-500"></div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500"></div>
        </div>
        
        {/* Bumper Game Badge */}
        {tenant.is_bumper_game && (
          <div className="relative z-10 mt-3 animate-bounce-slow">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white font-bold text-sm tracking-widest uppercase shadow-[0_0_15px_rgba(225,29,72,0.6)] border border-red-300/50">
              🌟 BUMPER GAME 🌟
            </span>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        
        {/* Quick Action Icons */}
        <div className="flex justify-center items-center gap-4 py-2">
          {/* Call Icon */}
          <a href={`tel:${tenant.whatsappNumber || ''}`} className="bg-[#1f0b3e] hover:bg-[#2a134a] p-3 rounded-full border border-[#3b1763] text-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.2)] hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all inline-flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </a>
          
          {/* WhatsApp Icon */}
          <a href={buildWhatsAppUrl(tenant.whatsappNumber || '', 'Hi, I want to inquire about the Tambola game.')} target="_blank" rel="noopener noreferrer" className="bg-[#1f0b3e] hover:bg-[#2a134a] p-3 rounded-full border border-[#3b1763] text-[#25D366] shadow-[0_0_10px_rgba(37,211,102,0.2)] hover:shadow-[0_0_15px_rgba(37,211,102,0.4)] transition-all inline-flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          </a>

          {/* Sound Toggle Icon */}
          <button 
            onClick={toggleSound}
            className="bg-[#1f0b3e] hover:bg-[#2a134a] p-3 rounded-full border border-[#3b1763] text-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.2)] hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all flex items-center justify-center relative group"
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
          
          {/* Agents Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowAgentsMenu(!showAgentsMenu)}
              className="bg-[#1f0b3e] hover:bg-[#2a134a] p-3 rounded-full border border-[#3b1763] text-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.2)] hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all"
              title="View Agents"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </button>
            
            {showAgentsMenu && (
              <>
                {/* Invisible overlay to close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowAgentsMenu(false)}
                ></div>
                
                <div className="absolute top-full right-0 sm:-right-4 mt-2 w-56 bg-[#1f0b3e] border border-[#3b1763] rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.2)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-[#3b1763] bg-[#2a134a]">
                    <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Authorized Agents</h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {agents && agents.length > 0 ? (
                      agents.map(agent => (
                        <div key={agent.id} className="px-4 py-3 text-sm text-slate-200 border-b border-[#3b1763]/50 last:border-0 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          {agent.name}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-xs text-slate-400 italic text-center">
                        No agents assigned
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* User Profile Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="bg-[#1f0b3e] hover:bg-[#2a134a] p-3 rounded-full border border-[#3b1763] text-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.2)] hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all"
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
                
                <div className="absolute top-full right-0 sm:-right-4 mt-2 w-48 bg-[#1f0b3e] border border-[#3b1763] rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.2)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <a 
                    href="/admin" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-3 text-sm text-slate-200 hover:bg-[#2a134a] hover:text-yellow-400 font-bold transition-colors border-b border-[#3b1763]"
                  >
                    Login as an Admin
                  </a>
                  <a 
                    href="/agent" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-3 text-sm text-slate-200 hover:bg-[#2a134a] hover:text-yellow-400 font-bold transition-colors"
                  >
                    Login as an Agent
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
        {!isLive && (
          <>
            {/* STATS BAR (Mobile 3 columns inline) */}
            <div className="flex items-center justify-between border border-[#2a134a] rounded-lg bg-[#14052a] p-3 shadow-lg">
              <div className="flex flex-col flex-1 items-center justify-center border-r border-[#2a134a] px-1 text-center">
                <span className="text-xs font-bold text-gray-300">{formattedDate}</span>
                <span className="text-sm font-black text-yellow-400 mt-0.5">{formattedTime}</span>
              </div>
              
              <div className="flex flex-col flex-1 items-center justify-center border-r border-[#2a134a] px-1 text-center">
                <CountdownTimer
                  targetDate={displayGame.scheduled_at || new Date().toISOString()}
                  className="text-lg font-black text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)] tracking-wide"
                />
              </div>
              
              <div className="flex flex-col flex-1 items-center justify-center px-1 text-center">
                <span className="text-xs font-bold text-gray-300">Tickets Bought</span>
                <span className="text-sm font-black text-yellow-400 mt-0.5">
                  {bookedCount} / {totalCount}
                </span>
              </div>
            </div>

            {/* PRIZE LIST */}
            <div className="border border-[#2a134a] rounded-lg bg-[#14052a] shadow-lg relative p-4">
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-xs">←❈</span>
                  <h3 className="text-yellow-400 font-bold tracking-widest text-sm uppercase">Prize List</h3>
                  <span className="text-amber-500 text-xs">❈→</span>
                </div>
              </div>
              
              <div className="flex flex-row items-center gap-4">
                {/* Trophy Placeholder */}
                <div className="w-24 h-28 sm:w-40 sm:h-40 shrink-0 relative flex items-center justify-center bg-gradient-to-b from-yellow-500/20 to-transparent rounded-lg border border-yellow-500/20">
                  <span className="text-5xl sm:text-7xl drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">🏆</span>
                </div>
                
                <div className="flex-1 w-full space-y-2">
                  {liveDividends.filter(d => d.is_active).map((prize, index) => (
                    <div key={prize.id || index} className="flex items-center justify-between border-b border-[#2a134a] pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {index + 1}
                        </div>
                        <span className="text-slate-200 text-xs sm:text-sm font-medium">{prize.name}</span>
                      </div>
                      <span className="text-yellow-400 font-bold text-xs sm:text-sm">₹{prize.prize_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {dividends.filter(d => d.is_active).length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-4">No active prizes</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CONDITIONAL: LIVE GAME VIEW vs BOOKING VIEW
        ════════════════════════════════════════════════════════════════════ */}

        {isLive && (
          <div className="space-y-5 pt-4 pb-20">
            {/* ── GAME STATUS banner ────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="flex items-center gap-2 bg-[#1f0b3e] border border-yellow-500/40 rounded-full px-5 py-2 shadow-lg">
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
                <span className="text-sm sm:text-base font-black text-yellow-500 tracking-[0.2em] uppercase">
                  {gameStatus === 'running' ? 'Game is Live' : 'Game Ended'}
                </span>
              </div>
              <p className="text-xs text-yellow-200 font-medium">
                {calledNumbers.length} of 90 numbers called
              </p>

              {/* ── Recently Called Numbers Strip ──────────────────────────── */}
              {displayHistory.length > 0 && (
                <div className="w-full max-w-lg mx-auto bg-[#14052a] rounded-xl border border-[#3b1763] p-3 mt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-yellow-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap px-2 w-full text-center mb-1">
                      History
                    </span>
                    {displayHistory.slice().reverse().map((n, i) => (
                      <div 
                        key={i} 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black shadow-sm text-xs sm:text-sm transition-all ${
                          i === 0 
                            ? "bg-yellow-500 text-black ring-2 ring-yellow-300 scale-110" 
                            : "bg-[#2a134a] text-slate-300 opacity-80"
                        }`}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Winners Summary ─────────────────────────────────────────── */}
            {winners.length > 0 && (
              <div className="w-full max-w-lg mx-auto bg-[#14052a] rounded-xl border border-yellow-500/20 p-3 mb-2">
                <p className="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mb-2">🏆 Winners ({winners.length})</p>
                <div className="space-y-1">
                  {winners.map((w, i) => {
                    const t = tickets.find(ticket => ticket.id === w.ticket_id);
                    const tNo = t?.ticket_number || w.ticket_id?.slice(-6);
                    const tName = t?.player_name ? ` (${t.player_name})` : '';
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium">Ticket No. {tNo}{tName}</span>
                        <span className="text-yellow-200">{w.matched_numbers?.length} numbers matched</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Winner Announcement Toast ───────────────────────────────── */}
            {latestWinner && (
              <div className="w-full max-w-lg mx-auto flex items-center gap-3 bg-yellow-500/15 border border-yellow-500/50 rounded-2xl px-4 py-3 animate-pulse shadow-lg">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-yellow-500 font-black text-sm tracking-wide uppercase">Winner!</p>
                  <p className="text-white text-xs font-medium">
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

            {/* ── Casino Slot Machine Number Reveal ─────────────────────────────────── */}
            <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-[#14052a] border border-[#2a134a] shadow-inner relative overflow-hidden" style={{ minHeight: '160px' }}>
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              {latestNumber ? (
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <p className="text-[10px] sm:text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2">Number Called</p>
                  <CasinoSlotMachine targetNumber={latestNumber} animKey={animKey} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-50 relative z-10">
                  <div className="w-24 h-24 rounded-full border-4 border-dashed border-[#2a134a] flex items-center justify-center">
                    <span className="text-[#2a134a] text-3xl font-black">?</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Waiting for first number…</p>
                </div>
              )}
            </div>

            {/* ── 1–90 Number Grid ──────────────────────────────────────── */}
            <div className="rounded-xl bg-[#1f0b3e] p-4 shadow-lg border border-[#3b1763]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest">Number Board</h3>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-300">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block"></span>Called</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#14052a] inline-block"></span>Not yet</span>
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
                          ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(250,204,21,0.7)] scale-110 z-10 relative'
                          : isCalled
                          ? 'bg-[#3b1763] text-white shadow-sm'
                          : 'bg-[#14052a] text-slate-500 border border-[#2a134a]',
                      ].join(' ')}
                    >
                      {n}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Prize Columns (Live Game) ────────────────────────────── */}
            <div className="mt-8 mb-4">
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-xs">←❈</span>
                  <h3 className="text-yellow-400 font-bold tracking-widest text-sm uppercase">Prize List</h3>
                  <span className="text-amber-500 text-xs">❈→</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {liveDividends.filter(d => d.is_active).map((prize, idx) => {
                  const prizeWinners = winners.filter(w => w.dividend_id === prize.id);
                  return (
                    <div key={prize.id || idx} className="bg-[#14052a] border border-[#2a134a] rounded-xl p-3 flex flex-col shadow-lg">
                      <div className="flex justify-between items-center border-b border-[#2a134a] pb-2 mb-2">
                        <span className="text-yellow-500 font-bold text-xs sm:text-sm uppercase">{prize.name}</span>
                        <span className="text-white font-black text-xs">₹{prize.prize_amount?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex-1">
                        {prizeWinners.length > 0 ? (
                          <div className="space-y-1">
                            {prizeWinners.map((w, i) => (
                              <div key={i} className="flex items-center gap-2 bg-[#1f0b3e] p-2 rounded-lg border border-[#3b1763]">
                                <span className="text-lg">🏆</span>
                                <div className="flex flex-col">
                                  <span className="text-white font-bold text-xs">
                                    {(() => {
                                      const t = tickets.find(ticket => ticket.id === w.ticket_id);
                                      const tNo = t?.ticket_number || w.ticket_id?.slice(-6) || w.ticket_id;
                                      const tName = t?.player_name ? ` (${t.player_name})` : '';
                                      return `Ticket No. ${tNo}${tName}`;
                                    })()}
                                  </span>
                                  <span className="text-yellow-200 text-[10px]">{w.matched_numbers?.length} matched</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full py-4 opacity-50">
                            <span className="text-slate-400 text-xs font-medium">Waiting for winner...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


        {/* ═══════════════════════════════════════════════════════════════════
            TICKETS SECTION (ALWAYS SHOWN)
        ════════════════════════════════════════════════════════════════════ */}
        </div>
        )}

        <div className="pt-2">
          {/* Banner */}
          <div className="flex justify-center mb-4 relative">
            <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black px-6 py-1.5 rounded-sm font-black tracking-wider text-[11px] flex items-center gap-2 shadow-[0_0_10px_rgba(250,204,21,0.4)] relative z-10">
              <span className="text-xs">🎟</span> {isLive ? "LIVE TICKETS" : "TICKETS FOR COMING GAME"} <span className="text-xs">✦</span>
            </div>
            {/* Ribbon ends */}
            <div className="absolute top-1/2 -translate-y-1/2 left-[10%] sm:left-[35%] w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[15px] border-r-amber-700"></div>
            <div className="absolute top-1/2 -translate-y-1/2 right-[10%] sm:right-[35%] w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[15px] border-l-amber-700"></div>
          </div>
          
          {/* Tabs */}
          {!isLive && (
          <div className="flex w-full gap-1 sm:gap-2 mb-4">
            <button 
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
              className={`flex-1 font-extrabold py-2 rounded text-[9px] sm:text-xs tracking-tight ${filter === 'all' ? 'bg-yellow-500 text-black' : 'bg-[#14052a] border border-[#2a134a] text-slate-300'}`}
            >
              ALL TICKETS ({totalCount})
            </button>
            <button 
              onClick={() => { setFilter('booked'); setCurrentPage(1); }}
              className={`flex-1 font-bold py-2 rounded text-[9px] sm:text-xs tracking-tight ${filter === 'booked' ? 'bg-yellow-500 text-black' : 'bg-[#14052a] border border-[#2a134a] text-slate-300'}`}
            >
              TICKETS SOLD ({bookedCount})
            </button>
            <button 
              onClick={() => { setFilter('available'); setCurrentPage(1); }}
              className={`flex-1 font-bold py-2 rounded text-[9px] sm:text-xs tracking-tight ${filter === 'available' ? 'bg-yellow-500 text-black' : 'bg-[#14052a] border border-[#2a134a] text-slate-300'}`}
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
              className="w-full bg-[#1f0b3e] border border-[#3b1763] rounded-lg px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500 shadow-inner"
            />
          </div>
          
          {/* Ticket grid list */}
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 pb-20">
            {paginatedTickets.map((ticket) => (
              <RealTicketCard 
                key={ticket.id} 
                ticket={ticket}
                isLive={isLive}
                calledNumbers={displayHistory}
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
                className="px-4 py-2 bg-[#2a134a] text-white rounded-md font-bold disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <span className="text-yellow-400 font-bold text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-[#2a134a] text-white rounded-md font-bold disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Floating Action Bar for WhatsApp Booking */}
      {selectedTickets.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-10 flex justify-center pointer-events-none">
          <div className="bg-[#1f0b3e] text-slate-200 p-3 sm:p-4 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] border-2 border-yellow-500 flex items-center justify-between gap-4 sm:gap-8 w-full max-w-lg pointer-events-auto">
            <div>
              <p className="text-xs text-yellow-500 font-bold uppercase tracking-wider">Selected Tickets</p>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="font-black text-lg text-white leading-none">{selectedTickets.length} <span className="text-sm font-normal text-slate-400">/ 6 Max</span></p>
                <button 
                  onClick={() => setSelectedTickets([])} 
                  className="bg-[#14052a] text-slate-400 hover:text-white hover:bg-red-500/80 rounded-full p-1 transition-all border border-[#3b1763]" 
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

// Mobile-perfect Real Ticket Card for Festival Theme
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
    <div className={`relative rounded-lg overflow-hidden border shadow-lg transition-all ${isSelected ? 'border-yellow-400 bg-[#322300]' : 'border-[#3b1763] bg-transparent'} ${isBooked && !isLive ? 'opacity-50 saturate-50' : ''} ${isRetired ? 'opacity-60 grayscale' : ''}`}>
      {isRetired && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="bg-red-600/90 text-white font-black text-xl sm:text-2xl tracking-widest px-10 py-1 sm:py-2 transform -rotate-12 border-y-4 border-white shadow-2xl uppercase whitespace-nowrap">
            WON
          </div>
        </div>
      )}
      <div className={`flex justify-between items-center px-3 py-2 transition-colors ${isSelected ? 'bg-yellow-500/20' : 'bg-[#1f0b3e]'}`}>
        <div className="flex items-center gap-1.5 truncate pr-2">
          <span className="text-white font-semibold text-xs tracking-wide shrink-0">Ticket No. {ticket.ticket_number}</span>
          {isBooked && ticket.player_name && (
            <span className="text-slate-300 font-bold text-[10px] truncate max-w-[120px] sm:max-w-[150px]">
              • {ticket.player_name}
            </span>
          )}
          {!isBooked && (
            <span className="text-slate-300 font-bold text-[10px] truncate w-full">
              • Unbooked
            </span>
          )}
        </div>
        {!isLive && (
          <div className="flex items-center gap-2 shrink-0">
            {isBooked ? (
              <>
                <span className="bg-[#16a34a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">BOOKED</span>
              </>
            ) : (
              <>
                {onToggleSelect ? (
                  <button 
                    onClick={onToggleSelect}
                    className={`text-[9px] font-extrabold px-2 py-1 rounded shadow-[0_0_8px_rgba(250,204,21,0.5)] transition-all ${isSelected ? 'bg-yellow-500 text-black' : 'bg-[#f97316] hover:bg-orange-500 text-white'}`}
                  >
                    {isSelected ? 'SELECTED' : 'SELECT'}
                  </button>
                ) : (
                  <span className="bg-[#f97316] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">AVAILABLE</span>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      <div className={`p-1.5 sm:p-2 transition-colors ${isSelected ? 'bg-[#322300]' : 'bg-[#fef8f0]'}`}>
        <div className={`border ${isSelected ? 'border-yellow-600/50' : 'border-[#5a2e15]/20'}`}>
          {(ticket.grid || []).map((row, i) => (
            <div key={i} className={`flex w-full border-b last:border-0 ${isSelected ? 'border-yellow-600/50' : 'border-[#5a2e15]/20'}`}>
              {row.map((num, j) => {
                const isCut = isLive && num !== 0 && calledNumbers.includes(num);
                return (
                  <div key={j} className={`relative flex-1 text-center py-1.5 font-extrabold border-r last:border-0 text-xs sm:text-sm h-6 sm:h-8 flex items-center justify-center transition-colors ${
                    isSelected ? 'text-yellow-500 border-yellow-600/50' : 'text-black border-[#5a2e15]/20'
                  } ${isCut ? 'bg-yellow-200/50 text-[#5a2e15]' : ''}`}>
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

