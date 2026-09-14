"use client";

import React, { useMemo } from "react";
import type { Game, Ticket, Dividend } from "@/types";

interface Props {
  game: Game | null;
  tickets: Ticket[];
  dividends: Dividend[];
}

export function NewBusinessInfoSection({ game, tickets, dividends }: Props) {
  const stats = useMemo(() => {
    // 1. Calculate booked tickets
    const bookedTickets = tickets
      .filter(t => t.status === "booked" || t.status === "confirmed")
      .sort((a, b) => a.ticket_number - b.ticket_number);
    
    const bookedCount = bookedTickets.length;

    // 2. Calculate sheets
    let halfSheetsBooked = 0;
    let fullSheetsBooked = 0;

    if (bookedTickets.length > 0) {
      const runs = [];
      let currentRun = [bookedTickets[0]];
      for (let i = 1; i < bookedTickets.length; i++) {
        if (bookedTickets[i].ticket_number === bookedTickets[i-1].ticket_number + 1) {
          currentRun.push(bookedTickets[i]);
        } else {
          runs.push(currentRun);
          currentRun = [bookedTickets[i]];
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

    // 3. Simple values
    const totalTicket = game?.total_tickets || 0;
    const ticketLeft = totalTicket - bookedCount;
    const ticketPrice = game?.ticket_price || 0;
    const agentCommission = game?.agency_commission || 0;
    
    // 4. Financials
    const totalRevenue = bookedCount * ticketPrice;
    const totalPrizeMoney = dividends
      .filter(d => d.is_active || (d as any).active)
      .reduce((sum, d) => sum + (Number(d.prize_amount) || Number((d as any).prizeAmount) || 0), 0);
    
    // As per user's example math: 6200 revenue - (62 booked * 50 commission) - 19010 prize = -15910
    const totalAgentCommission = bookedCount * agentCommission;
    const totalProfit = totalRevenue - totalAgentCommission - totalPrizeMoney;

    return {
      totalTicket,
      bookedCount,
      halfSheetsBooked,
      fullSheetsBooked,
      ticketLeft,
      ticketPrice,
      agentCommission,
      totalRevenue,
      totalPrizeMoney,
      totalProfit
    };
  }, [game, tickets, dividends]);

  const rows = [
    { label: "Total ticket", value: stats.totalTicket },
    { label: "Total ticket booked", value: stats.bookedCount },
    { label: "Total haftsheet booked", value: stats.halfSheetsBooked },
    { label: "Total fullsheet booked", value: stats.fullSheetsBooked },
    { label: "Ticket left", value: stats.ticketLeft },
    { label: "Ticket price", value: `${stats.ticketPrice} INR` },
    { label: "Agent commission", value: `${stats.agentCommission} INR` },
    { label: "Total revenue", value: `${stats.totalRevenue} INR` },
    { label: "Total prize money", value: `${stats.totalPrizeMoney} INR` },
    { label: "Total profit", value: `${stats.totalProfit} INR` },
  ];

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-[#0b00c4] text-center">
        <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase">
          BUSINESS INFO
        </h2>
      </div>

      {/* Table Container */}
      <div className="bg-[#0b00c4] px-2 pb-2">
        {/* Table Headers */}
        <div className="flex border-b border-black h-10 bg-black">
          <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-white text-sm">
            Settings type
          </div>
          <div className="flex-1 flex items-center px-3 font-bold text-white text-sm">
            Settings value
          </div>
        </div>

        {/* Table Rows */}
        <div className="bg-[#0b00c4] pt-2 space-y-1">
          {rows.map((row, i) => (
            <div key={i} className="flex bg-white border border-black min-h-[40px]">
              <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
                {row.label}
              </div>
              <div className="flex-1 flex items-center px-3 font-bold text-black text-[13px] sm:text-sm md:text-base py-2">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
