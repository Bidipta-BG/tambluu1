"use client";

import { useEffect, useRef } from "react";
import type { Ticket } from "@/types";

interface QuickBookModalProps {
  tickets: Ticket[];
  selectedTickets: number[];
  onToggleTicket: (ticketNumber: number) => void;
  totalCount: number;
  bookedCount: number;
  availableCount: number;
  onClose: () => void;
}

export default function QuickBookModal({
  tickets,
  selectedTickets,
  onToggleTicket,
  totalCount,
  bookedCount,
  availableCount,
  onClose,
}: QuickBookModalProps) {
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

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 pb-[100px] sm:p-4 sm:pb-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label="Quick Book"
    >
      {/* Panel */}
      <div
        className="w-full sm:max-w-lg bg-[#0e0620] border border-[#3b1763] rounded-2xl shadow-2xl flex flex-col h-[75vh] max-h-[800px]"
        style={{ animation: "modalSlideIn 0.22s ease-out" }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2a134a] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-xs font-semibold text-yellow-500 uppercase tracking-widest">Quick Book</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tap any available number to select</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-[#2a134a] transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        <div className="flex items-stretch divide-x divide-[#2a134a] border-b border-[#2a134a] shrink-0">
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
            <span className="text-base font-black text-white">{totalCount}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Booked</span>
            <span className="text-base font-black text-[#16a34a]">{bookedCount}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available</span>
            <span className="text-base font-black text-orange-400">{availableCount}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Selected</span>
            <span className="text-base font-black text-yellow-400">{selectedTickets.length} <span className="text-xs font-normal text-slate-500">/ 6</span></span>
          </div>
        </div>

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 bg-[#0e0620] border-b border-[#2a134a] shrink-0">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-block w-4 h-4 rounded bg-[#16a34a]/30 border border-[#16a34a]/60"></span>Booked
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-block w-4 h-4 rounded bg-[#2a134a] border border-orange-500/50"></span>Available
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-block w-4 h-4 rounded bg-yellow-500/30 border-2 border-yellow-400"></span>Selected
          </span>
        </div>

        {/* ── Ticket Number Grid ──────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
            {tickets.map((ticket) => {
              const isBooked = ticket.status === "booked" || ticket.status === "confirmed";
              const isSelected = selectedTickets.includes(ticket.ticket_number);

              let cellClass =
                "relative flex items-center justify-center rounded text-[11px] font-bold h-8 w-full transition-all select-none ";

              if (isSelected) {
                cellClass += "bg-yellow-500/30 border-2 border-yellow-400 text-yellow-300 scale-105 shadow-[0_0_6px_rgba(250,204,21,0.5)]";
              } else if (isBooked) {
                cellClass += "bg-[#16a34a]/20 border border-[#16a34a]/50 text-green-400 cursor-not-allowed opacity-70";
              } else {
                cellClass += "bg-[#2a134a] border border-[#3b1763] text-slate-300 cursor-pointer hover:border-orange-500 hover:text-white hover:bg-[#3b1763] active:scale-95";
              }

              return (
                <button
                  key={ticket.id}
                  className={cellClass}
                  disabled={isBooked}
                  onClick={() => {
                    if (isBooked) return;
                    if (!isSelected && selectedTickets.length >= 6) {
                      alert("You can select up to 6 tickets at a time.");
                      return;
                    }
                    onToggleTicket(ticket.ticket_number);
                  }}
                  title={
                    isBooked
                      ? `#${ticket.ticket_number} — Booked${ticket.player_name ? ` by ${ticket.player_name}` : ""}`
                      : isSelected
                      ? `#${ticket.ticket_number} — Selected (tap to deselect)`
                      : `#${ticket.ticket_number} — Available`
                  }
                >
                  {ticket.ticket_number}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-[#0e0620] flex items-center justify-center">
                      <svg className="w-2 h-2 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer note ────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-[#2a134a] bg-[#0e0620] rounded-b-2xl shrink-0">
          <p className="text-[10px] text-slate-500 text-center">
            {selectedTickets.length > 0
              ? `${selectedTickets.length} ticket${selectedTickets.length > 1 ? "s" : ""} selected — tap "Book via WhatsApp" below to proceed`
              : "Select up to 6 tickets, then tap the WhatsApp button that appears"}
          </p>
        </div>
      </div>
    </div>
  );
}
