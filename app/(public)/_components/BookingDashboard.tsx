import type { Ticket, Game, Tenant } from "@/types";
import TicketCard from "./TicketCard";

interface BookingDashboardProps {
  tenant: Tenant;
  game?: Game | null;
  tickets?: Ticket[];
}

export default function BookingDashboard({
  tenant,
  game,
  tickets = [],
}: BookingDashboardProps) {
  const isMock = !game;
  const displayGame = game || {
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
        ticket_number: `TKT-${i + 1}`,
        status: i < 248 ? "booked" : "available",
        numbers: [],
        player_name: i < 248 ? "Player" : null,
      }))
    : tickets;

  const bookedCount = displayTickets.filter((t) => t.status === "booked").length;
  const totalCount = displayGame.total_tickets;
  const availableCount = totalCount - bookedCount;

  return (
    <div className="w-full min-h-screen bg-[#090114] font-sans text-white pb-20 overflow-x-hidden">
      
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
        <h1 className="relative z-10 text-3xl sm:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 tracking-wide text-center">
          FESTIVAL TAMBOLA
        </h1>
        
        {/* Subtitle */}
        <div className="relative z-10 flex items-center justify-center gap-3 mt-1 w-full max-w-xs">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500"></div>
          <div className="w-2 h-2 rotate-45 border border-amber-500"></div>
          <p className="text-[10px] sm:text-xs font-semibold text-white tracking-widest uppercase">Play Together, Win Together</p>
          <div className="w-2 h-2 rotate-45 border border-amber-500"></div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        
        {/* STATS BAR (Mobile 3 columns inline) */}
        <div className="flex items-center justify-between border border-[#2a134a] rounded-lg bg-[#14052a] p-3 shadow-lg">
          <div className="flex flex-col flex-1 items-center justify-center border-r border-[#2a134a]">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-pink-500 text-sm">📅</span>
              <span className="text-[10px] text-gray-300">Game Starts</span>
            </div>
            <span className="text-[9px] text-gray-400">Sat, 24 May 2025</span>
            <span className="text-[13px] font-bold text-yellow-400 mt-0.5">08:00 PM</span>
          </div>
          
          <div className="flex flex-col flex-1 items-center justify-center border-r border-[#2a134a]">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-purple-400 text-sm">⏱</span>
              <span className="text-[10px] text-gray-300">Starts In</span>
            </div>
            <span className="text-lg font-black text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
              02h 14m 32s
            </span>
          </div>
          
          <div className="flex flex-col flex-1 items-center justify-center">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-amber-500 text-sm">🎟</span>
              <span className="text-[10px] text-gray-300">Tickets Bought</span>
            </div>
            <span className="text-sm font-bold text-white mt-1">
              248 / 500
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
              {[
                { label: "Full House", amount: "₹10,000", id: 1 },
                { label: "Top Line", amount: "₹5,000", id: 2 },
                { label: "Middle Line", amount: "₹3,000", id: 3 },
                { label: "Early 5", amount: "₹2,000", id: 4 },
                { label: "Corner", amount: "₹1,000", id: 5 },
              ].map((prize) => (
                <div key={prize.id} className="flex items-center justify-between border-b border-[#2a134a] pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {prize.id}
                    </div>
                    <span className="text-slate-200 text-xs sm:text-sm font-medium">{prize.label}</span>
                  </div>
                  <span className="text-yellow-400 font-bold text-xs sm:text-sm">{prize.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LAST GAME WINNERS */}
        <div className="border border-[#2a134a] rounded-lg bg-[#14052a] p-3 shadow-lg relative">
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-sm">🏆</span>
              <h3 className="text-yellow-400 font-bold tracking-widest text-xs uppercase">Last Game Winners</h3>
            </div>
          </div>
          
          <div className="flex flex-row justify-between gap-1 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* 1st Place */}
            <div className="flex flex-col items-center justify-center text-center gap-1 min-w-[30%]">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs border-2 border-yellow-200 shadow-[0_0_10px_#facc15]">1</div>
              </div>
              <p className="text-[10px] font-bold text-white mt-1 truncate w-full">Nina Das</p>
              <p className="text-[8px] text-gray-400">Ticket A-125</p>
              <p className="text-[11px] font-bold text-yellow-400">₹10,000</p>
            </div>
            
            {/* 2nd Place */}
            <div className="flex flex-col items-center justify-center text-center gap-1 min-w-[30%] border-l border-r border-[#2a134a] px-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-black font-bold text-xs border-2 border-white shadow-[0_0_10px_#d1d5db]">2</div>
              </div>
              <p className="text-[10px] font-bold text-white mt-1 truncate w-full">Ravi Jain</p>
              <p className="text-[8px] text-gray-400">Ticket B-067</p>
              <p className="text-[11px] font-bold text-gray-300">₹5,000</p>
            </div>
            
            {/* 3rd Place */}
            <div className="flex flex-col items-center justify-center text-center gap-1 min-w-[30%]">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-xs border-2 border-orange-300 shadow-[0_0_10px_#ea580c]">3</div>
              </div>
              <p className="text-[10px] font-bold text-white mt-1 truncate w-full">Rosie Saha</p>
              <p className="text-[8px] text-gray-400">Ticket C-032</p>
              <p className="text-[11px] font-bold text-orange-400">₹3,000</p>
            </div>
          </div>
        </div>

        {/* TICKETS SECTION */}
        <div className="pt-2">
          {/* Banner */}
          <div className="flex justify-center mb-4 relative">
            <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black px-6 py-1.5 rounded-sm font-black tracking-wider text-[11px] flex items-center gap-2 shadow-[0_0_10px_rgba(250,204,21,0.4)] relative z-10">
              <span className="text-xs">🎟</span> TICKETS FOR COMING GAME <span className="text-xs">✦</span>
            </div>
            {/* Ribbon ends */}
            <div className="absolute top-1/2 -translate-y-1/2 left-[10%] sm:left-[35%] w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[15px] border-r-amber-700"></div>
            <div className="absolute top-1/2 -translate-y-1/2 right-[10%] sm:right-[35%] w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[15px] border-l-amber-700"></div>
          </div>
          
          {/* Tabs */}
          <div className="flex w-full gap-1 sm:gap-2 mb-4">
            <button className="flex-1 bg-yellow-500 text-black font-extrabold py-2 rounded text-[9px] sm:text-xs tracking-tight">
              ALL TICKETS (500)
            </button>
            <button className="flex-1 bg-[#14052a] border border-[#2a134a] text-slate-300 font-bold py-2 rounded text-[9px] sm:text-xs tracking-tight">
              TICKETS SOLD (248)
            </button>
            <button className="flex-1 bg-[#14052a] border border-[#2a134a] text-slate-300 font-bold py-2 rounded text-[9px] sm:text-xs tracking-tight">
              AVAILABLE (252)
            </button>
          </div>
          
          {/* Mock ticket grid list */}
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            <TicketCardMock ticketNo="7KQ8L3" status="BOOKED" player="Nina Das" />
            <TicketCardMock ticketNo="2M9P1X" status="AVAILABLE" player="" />
            <TicketCardMock ticketNo="5YJ3D7" status="BOOKED" player="Manoj Sarkar" />
            <TicketCardMock ticketNo="8TQ6Z2" status="AVAILABLE" player="" />
            <TicketCardMock ticketNo="1VZ4B6" status="BOOKED" player="Rosie Saha" />
          </div>
        </div>

      </div>
    </div>
  );
}

// Mobile-perfect Ticket Card matching the 7-column layout screenshot
function TicketCardMock({ ticketNo, status, player }: { ticketNo: string, status: string, player: string }) {
  const isBooked = status === "BOOKED";
  
  // Random grid matching screenshot exactly (3x7)
  const grid = [
    [4, 18, 37, 46, 60, 72, 85],
    [11, 23, 32, 54, 63, 77, 88],
    [5, 20, 41, 56, 69, 83, 90]
  ];

  return (
    <div className="rounded-lg overflow-hidden border border-[#3b1763] shadow-lg">
      <div className="bg-[#1f0b3e] flex justify-between items-center px-3 py-2">
        <span className="text-white font-semibold text-xs tracking-wide">Ticket No. {ticketNo}</span>
        <div className="flex items-center gap-2">
          {isBooked ? (
            <>
              <span className="bg-[#16a34a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">BOOKED</span>
              <span className="text-slate-300 text-[10px] truncate max-w-[80px]">{player}</span>
            </>
          ) : (
            <>
              <span className="bg-[#f97316] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">AVAILABLE</span>
              <span className="text-slate-400 text-[10px]">Unbooked</span>
            </>
          )}
        </div>
      </div>
      
      <div className="bg-[#fef8f0] p-1.5 sm:p-2">
        <div className="border border-[#5a2e15]/20">
          {grid.map((row, i) => (
            <div key={i} className="flex w-full border-b border-[#5a2e15]/20 last:border-0">
              {row.map((num, j) => (
                <div key={j} className="flex-1 text-center py-1.5 text-black font-extrabold border-r border-[#5a2e15]/20 last:border-0 text-xs sm:text-sm">
                  {num}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
