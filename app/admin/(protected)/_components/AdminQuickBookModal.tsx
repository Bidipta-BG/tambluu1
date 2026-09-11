"use client";

import { useEffect, useRef } from "react";
import type { Ticket } from "@/types";

interface AdminQuickBookModalProps {
  tickets: Ticket[];
  selectedTickets: Ticket[];
  onToggleTicket: (ticket: Ticket) => void;
  totalCount: number;
  bookedCount: number;
  availableCount: number;
  onClose: () => void;
  playerName: string;
  setPlayerName: (n: string) => void;
  playerPhone: string;
  setPlayerPhone: (p: string) => void;
  onBook: (e: React.FormEvent) => void;
  isBooking: boolean;
}

function categorizeTickets(selected: Ticket[]) {
  const fullSheets: number[][] = [];
  const halfSheets: number[][] = [];
  const randomTickets: number[] = [];

  if (selected.length === 0) return { fullSheets, halfSheets, randomTickets };

  const sorted = [...selected].sort((a, b) => a.ticket_number - b.ticket_number);

  const runs: number[][] = [];
  let currentRun = [sorted[0].ticket_number];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].ticket_number === sorted[i - 1].ticket_number + 1) {
      currentRun.push(sorted[i].ticket_number);
    } else {
      runs.push(currentRun);
      currentRun = [sorted[i].ticket_number];
    }
  }
  runs.push(currentRun);

  for (const run of runs) {
    let remaining = [...run];

    while (remaining.length >= 6) {
      fullSheets.push(remaining.slice(0, 6));
      remaining = remaining.slice(6);
    }

    if (remaining.length >= 3) {
      for (let i = 0; i <= remaining.length - 3; i++) {
        halfSheets.push(remaining.slice(i, i + 3));
      }
    } else {
      randomTickets.push(...remaining);
    }
  }

  return { fullSheets, halfSheets, randomTickets };
}

export default function AdminQuickBookModal({
  tickets,
  selectedTickets,
  onToggleTicket,
  onClose,
  playerName,
  setPlayerName,
  playerPhone,
  setPlayerPhone,
  onBook,
  isBooking
}: AdminQuickBookModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { fullSheets, halfSheets, randomTickets } = categorizeTickets(selectedTickets);

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label="Admin Quick Book"
    >
      {/* Panel */}
      <div
        className="w-full h-[92vh] sm:h-[85vh] sm:max-w-sm bg-[#000cfb] rounded-xl shadow-2xl flex flex-col relative overflow-hidden"
        style={{ animation: "modalSlideIn 0.2s ease-out" }}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between px-4 pt-6 pb-3 sm:pt-3 sm:pb-3 bg-[#0d47a1] border-b border-white/10 shrink-0 relative">
          <div className="flex-1"></div>
          <h2 className="text-white text-[18px] font-bold uppercase tracking-widest absolute left-1/2 -translate-x-1/2">
            Select Tickets
          </h2>
          <div className="flex-1 flex justify-end">
            <button
              onClick={onClose}
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5 shadow-sm transition-colors z-10"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Input Fields */}
        <div className="flex px-4 pt-4 pb-2">
          <input 
            type="text" 
            placeholder="Name" 
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-1/2 p-2.5 text-sm text-gray-800 outline-none placeholder-gray-500"
          />
          <input 
            type="text" 
            placeholder="Phone" 
            value={playerPhone}
            onChange={(e) => setPlayerPhone(e.target.value)}
            className="w-1/2 p-2.5 text-sm text-gray-800 border-l border-gray-300 outline-none placeholder-gray-500"
          />
        </div>

        {/* Selected Tickets Breakdowns */}
        <div className="px-4 pb-2 flex flex-col gap-3 shrink-0">
          {/* Random ticket */}
          <div>
            <h3 className="text-white font-bold text-[17px] mb-1">Random ticket</h3>
            <div className="border border-white rounded-full min-h-[38px] px-2 py-1.5 flex flex-wrap gap-2 items-center">
              {randomTickets.map(num => (
                <span key={num} className="bg-white text-black w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold">
                  {num}
                </span>
              ))}
            </div>
          </div>
          
          {/* Haftsheet ticket */}
          <div>
            <h3 className="text-white font-bold text-[17px] mb-1">Haftsheet ticket</h3>
            <div className="border border-white rounded-2xl min-h-[50px] p-2.5 flex flex-wrap gap-3 items-center">
              {halfSheets.map((sheet, idx) => (
                <div key={idx} className="border border-white rounded-full px-2 py-1.5 flex gap-2.5 bg-blue-900/40">
                   {sheet.map(num => (
                      <span key={num} className="bg-white text-black w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold">
                        {num}
                      </span>
                   ))}
                </div>
              ))}
            </div>
          </div>

          {/* Fullsheet ticket */}
          <div>
            <h3 className="text-white font-bold text-[17px] mb-1">Fullsheet ticket</h3>
            <div className="border border-white rounded-[2rem] min-h-[50px] p-2.5 flex flex-wrap gap-2 items-center justify-center">
              {fullSheets.map((sheet, idx) => (
                <div key={idx} className="border border-white rounded-full px-3 py-1.5 flex gap-3 w-full justify-center bg-blue-900/40">
                   {sheet.map(num => (
                      <span key={num} className="bg-white text-black w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold">
                        {num}
                      </span>
                   ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Book Now Button */}
        <div className="px-4 py-2 shrink-0">
           <button 
             onClick={(e) => {
               e.preventDefault();
               if (selectedTickets.length === 0) {
                 alert("Select at least one ticket.");
                 return;
               }
               if (!playerName.trim() || !playerPhone.trim()) {
                 alert("Please enter name and phone number.");
                 return;
               }
               onBook(e as any);
             }}
             disabled={isBooking}
             className="w-full bg-[#ff0000] hover:bg-red-700 disabled:bg-red-900 text-white font-bold py-3 text-[16px] transition-colors flex justify-center items-center"
           >
             {isBooking ? "BOOKING..." : "BOOK NOW"}
           </button>
        </div>

        {/* Main Ticket Grid Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-6 border-t border-l border-gray-300 bg-white">
            {tickets.map((ticket) => {
              const isBooked = ticket.status === "booked" || ticket.status === "confirmed";
              const isSelected = selectedTickets.some(t => t.id === ticket.id);

              let cellClass = "flex items-center justify-center text-[13px] font-bold border-b border-r border-gray-300 h-9 transition-colors ";
              
              if (isBooked) {
                cellClass += "bg-[#ffea00] text-black cursor-not-allowed";
              } else if (isSelected) {
                cellClass += "bg-[#ffcdd2] text-black shadow-[inset_0_0_0_1px_#ef9a9a]"; // Pinkish red
              } else {
                cellClass += "bg-white text-black hover:bg-gray-100 cursor-pointer";
              }

              return (
                <button
                  key={ticket.id}
                  type="button"
                  className={cellClass}
                  disabled={isBooked}
                  onClick={() => {
                    if (isBooked) return;
                    onToggleTicket(ticket);
                  }}
                >
                  {ticket.ticket_number}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
