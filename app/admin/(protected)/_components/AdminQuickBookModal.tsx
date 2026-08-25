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
}

export default function AdminQuickBookModal({
  tickets,
  selectedTickets,
  onToggleTicket,
  totalCount,
  bookedCount,
  availableCount,
  onClose,
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

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm pb-[88px] sm:pb-0"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label="Admin Quick Book"
    >
      {/* Panel */}
      <div
        className="w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ animation: "modalSlideIn 0.22s ease-out" }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest">Quick Book</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tap any available number to select</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        <div className="flex items-stretch divide-x divide-slate-800 border-b border-slate-800 shrink-0">
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
            <span className="text-base font-black text-white">{totalCount}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Booked</span>
            <span className="text-base font-black text-violet-400">{bookedCount}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available</span>
            <span className="text-base font-black text-emerald-400">{availableCount}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 gap-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Selected</span>
            <span className="text-base font-black text-amber-400">{selectedTickets.length} <span className="text-xs font-normal text-slate-500">/ 6</span></span>
          </div>
        </div>

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-block w-4 h-4 rounded bg-violet-500/20 border border-violet-500/50"></span>Booked
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-block w-4 h-4 rounded bg-slate-800 border border-slate-700"></span>Available
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-block w-4 h-4 rounded bg-emerald-500/20 border-2 border-emerald-500"></span>Selected
          </span>
        </div>

        {/* ── Ticket Number Grid ──────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
            {tickets.map((ticket) => {
              const isBooked = ticket.status === "booked" || ticket.status === "confirmed";
              const isSelected = selectedTickets.some(t => t.id === ticket.id);

              let cellClass =
                "relative flex items-center justify-center rounded text-[11px] font-bold h-8 w-full transition-all select-none ";

              if (isSelected) {
                cellClass += "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 scale-105 shadow-sm";
              } else if (isBooked) {
                cellClass += "bg-violet-500/10 border border-violet-500/30 text-violet-400 cursor-not-allowed opacity-70";
              } else {
                cellClass += "bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer hover:border-emerald-500/50 hover:text-white hover:bg-slate-700 active:scale-95";
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
                    onToggleTicket(ticket);
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
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-slate-900 flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
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
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900 rounded-b-2xl shrink-0">
          <p className="text-[10px] text-slate-500 text-center">
            {selectedTickets.length > 0
              ? `${selectedTickets.length} ticket${selectedTickets.length > 1 ? "s" : ""} selected — tap "Book Now" below to proceed`
              : "Select up to 6 tickets, then tap the Book Now button that appears"}
          </p>
        </div>
      </div>
    </div>
  );
}
