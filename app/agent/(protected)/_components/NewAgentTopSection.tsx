"use client";

import React, { useMemo } from "react";
import type { Game, Ticket, AgentTicket } from "@/types";

interface Props {
  activeGame: Game | null;
  gameTickets: Ticket[];
  myBookedTickets: AgentTicket[];
}

export function NewAgentTopSection({ activeGame, gameTickets, myBookedTickets }: Props) {
  const stats = useMemo(() => {
    // Tickets booked by this agent for the CURRENT game
    const myActiveBookings = myBookedTickets
      .filter(t => t.game_id === activeGame?.id && (t.status === "booked" || t.status === "confirmed"))
      .sort((a, b) => a.ticket_number - b.ticket_number);

    const soldTicket = myActiveBookings.length;

    // Calculate halfsheets / fullsheets for this agent's bookings
    let halfSheetsBooked = 0;
    let fullSheetsBooked = 0;

    if (soldTicket > 0) {
      const runs = [];
      let currentRun = [myActiveBookings[0]];
      for (let i = 1; i < soldTicket; i++) {
        if (myActiveBookings[i].ticket_number === myActiveBookings[i-1].ticket_number + 1) {
          currentRun.push(myActiveBookings[i]);
        } else {
          runs.push(currentRun);
          currentRun = [myActiveBookings[i]];
        }
      }
      runs.push(currentRun);

      for (const run of runs) {
        const len = run.length;
        const full = Math.floor(len / 6);
        fullSheetsBooked += full;
        
        const remainder = len % 6;
        if (remainder >= 3) {
          halfSheetsBooked += (remainder - 2);
        }
      }
    }

    const totalTicket = activeGame?.total_tickets || 0;
    const ticketPrice = activeGame?.ticket_price || 0;
    const agentCommission = activeGame?.agency_commission || 0;

    // Game's total booked (to compute tickets left in the game)
    const gameBookedCount = gameTickets.filter(t => t.status === "booked" || t.status === "confirmed").length;
    const ticketLeft = totalTicket - gameBookedCount;

    // Agent's revenue and profit for THIS game
    const totalRevenue = soldTicket * ticketPrice;
    const totalProfit = soldTicket * agentCommission;

    return {
      totalTicket,
      soldTicket,
      halfSheetsBooked,
      fullSheetsBooked,
      ticketLeft,
      ticketPrice,
      agentCommission,
      totalRevenue,
      totalProfit
    };
  }, [activeGame, gameTickets, myBookedTickets]);

  const rows = [
    { label: "Total ticket", value: stats.totalTicket },
    { label: "Sold ticket", value: stats.soldTicket },
    { label: "Total haftsheet booked", value: stats.halfSheetsBooked },
    { label: "Total fullsheet booked", value: stats.fullSheetsBooked },
    { label: "Ticket left", value: stats.ticketLeft },
    { label: "Ticket price", value: `${stats.ticketPrice} INR` },
    { label: "Agent commission", value: `${stats.agentCommission} INR` },
    { label: "Total revenue", value: `${stats.totalRevenue} INR` },
    { label: "Total profit", value: `${stats.totalProfit} INR` }
  ];

  return (
    <div className="w-full flex flex-col items-center mx-auto space-y-8 sm:space-y-10">
      
      {/* AGENT DASHBOARD Header */}
      <div className="w-full flex flex-col items-center">
        <div className="w-full bg-[#0a0088] py-4 flex justify-center items-center shadow-lg border-2 border-transparent border-t-[#4a4a8a] border-b-[#050040]">
          <h1 className="text-white font-black text-xl sm:text-2xl tracking-widest uppercase">
            AGENT DASHBOARD
          </h1>
        </div>
      </div>

      {/* TOTAL EARNING Box */}
      <div className="w-full flex flex-col shadow-lg border-2 border-transparent border-t-[#4a4a8a] border-b-[#050040]">
        <div className="w-full bg-[#ffea00] py-3 flex justify-center items-center">
          <h2 className="text-black font-black text-xl sm:text-2xl tracking-wide uppercase">
            TOTAL EARNING
          </h2>
        </div>
        <div className="w-full bg-[#0a0088] p-6 sm:p-8 flex justify-center items-center">
          <div className="w-full max-w-sm bg-[#ff0000] py-6 sm:py-8 rounded-xl flex justify-center items-center shadow-md">
            <span className="text-white font-black text-4xl sm:text-5xl">
              {stats.totalProfit} INR
            </span>
          </div>
        </div>
      </div>

      {/* BUSINESS INFO Box */}
      <div className="w-full flex flex-col shadow-lg border-2 border-transparent border-t-[#4a4a8a] border-b-[#050040]">
        <div className="w-full bg-[#0a0088] py-4 flex justify-center items-center">
          <h2 className="text-white font-black text-xl sm:text-2xl tracking-wide uppercase">
            BUSINESS INFO
          </h2>
        </div>
        <div className="w-full bg-[#0a0088] px-3 pb-3">
          
          <div className="flex w-full bg-black text-white border-b border-black">
            <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm border-r border-black flex items-center">
              Settings type
            </div>
            <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm flex items-center">
              Settings value
            </div>
          </div>

          <div className="w-full space-y-[1px]">
            {rows.map((row, i) => (
              <div key={i} className="flex w-full bg-white border border-black min-h-[40px] sm:min-h-[44px]">
                <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black border-r border-black flex items-center">
                  {row.label}
                </div>
                <div className="w-1/2 p-2.5 sm:p-3 font-bold text-[13px] sm:text-sm text-black flex items-center">
                  {row.value}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
      
    </div>
  );
}
