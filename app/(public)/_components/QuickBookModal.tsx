"use client";

import { useEffect, useRef, useState } from "react";
import type { Ticket } from "@/types";
import { buildBookingWhatsAppUrl } from "@/lib/whatsapp";

interface QuickBookModalProps {
  tickets: Ticket[];
  whatsappNumber: string;
  gameDate: string | null;
  ticketPrice: number;
  businessName: string;
  onClose: () => void;
}

export default function QuickBookModal({
  tickets,
  whatsappNumber,
  gameDate,
  ticketPrice,
  businessName,
  onClose,
}: QuickBookModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);

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

  const handleToggleTicket = (ticketNumber: number) => {
    setSelectedTickets(prev => 
      prev.includes(ticketNumber) 
        ? prev.filter(n => n !== ticketNumber)
        : [...prev, ticketNumber]
    );
  };

  // Calculate stats
  const bookedTickets = tickets.filter(t => t.status === "booked" || t.status === "confirmed");
  const bookedCount = bookedTickets.length;

  let halfSheetBooked = 0;
  let fullSheetBooked = 0;

  if (bookedTickets.length > 0) {
    // Group into consecutive runs
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
      fullSheetBooked += full;
      
      const remainder = len % 6;
      if (remainder >= 3) {
        halfSheetBooked += (remainder - 2);
      }
    }
  }

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label="Booking Dashboard"
    >
      {/* Panel */}
      <div
        className="w-full max-w-sm sm:max-w-md h-[92vh] sm:h-[85vh] bg-[#0f0c29] border border-yellow-400 shadow-2xl flex flex-col relative"
        style={{ animation: "modalSlideIn 0.2s ease-out" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-white text-xl font-bold hover:text-gray-300 z-10"
          aria-label="Close"
        >
          X
        </button>

        {/* Header */}
        <div className="pt-3 pb-2 text-center shrink-0">
          <h2 
            className="text-red-500 font-bold text-xl sm:text-2xl tracking-wide"
            style={{ textShadow: "0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.6)" }}
          >
            Booking dashboard
          </h2>
        </div>

        <div className="px-3 pb-3 flex flex-col gap-2 flex-1 min-h-0">
          
          {/* Name Input */}
          <input 
            type="text" 
            placeholder="Your name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full shrink-0 bg-white text-gray-800 text-sm px-3 py-2 outline-none font-medium"
          />

          {/* Ticket Grid Container (Scrollable) */}
          <div className="w-full flex-1 overflow-y-auto bg-blue-700 p-1.5 mt-1 border border-blue-800">
            <div className="grid grid-cols-6 gap-1">
              {tickets.map((ticket) => {
                const isBooked = ticket.status === "booked" || ticket.status === "confirmed";
                const isSelected = selectedTickets.includes(ticket.ticket_number);

                let bgClass = "bg-white text-black";
                if (isBooked) {
                  bgClass = "bg-[#ffea00] text-black cursor-not-allowed font-bold";
                } else if (isSelected) {
                  bgClass = "bg-[#0000ff] text-black font-bold";
                } else {
                  bgClass = "bg-white text-black hover:bg-gray-200 cursor-pointer font-bold";
                }

                return (
                  <button
                    key={ticket.id}
                    className={`h-7 sm:h-8 flex items-center justify-center text-[11px] sm:text-xs transition-colors ${bgClass}`}
                    disabled={isBooked}
                    onClick={() => {
                      if (!isBooked) {
                        handleToggleTicket(ticket.ticket_number);
                      }
                    }}
                  >
                    {ticket.ticket_number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Book Now Button */}
          <button 
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm tracking-wider py-2.5 mt-1 transition-colors uppercase"
            onClick={() => {
              if (!name.trim()) {
                alert("Please enter your name");
                return;
              }
              if (selectedTickets.length === 0) {
                alert("Please select at least one ticket.");
                return;
              }
              
              const url = buildBookingWhatsAppUrl({
                whatsappNumber,
                ticketNumbers: selectedTickets,
                gameDate,
                ticketPrice,
                businessName,
                playerName: name.trim()
              });
              
              window.open(url, "_blank");
              onClose();
            }}
          >
            BOOK NOW
          </button>

          {/* Stats Boxes */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="w-full border border-red-600 rounded-md py-1.5 flex flex-col items-center justify-center text-red-500 shadow-[inset_0_0_10px_rgba(220,38,38,0.2)]">
              <span className="font-bold text-[15px] sm:text-[16px] leading-tight" style={{ textShadow: "0 0 8px rgba(239, 68, 68, 0.8)" }}>Ticket booked</span>
              <span className="font-black text-[16px] sm:text-[18px] leading-tight mt-0.5" style={{ textShadow: "0 0 8px rgba(239, 68, 68, 0.8)" }}>{bookedCount}</span>
            </div>
            
            <div className="w-full border border-red-600 rounded-md py-1.5 flex flex-col items-center justify-center text-red-500 shadow-[inset_0_0_10px_rgba(220,38,38,0.2)]">
              <span className="font-bold text-[15px] sm:text-[16px] leading-tight" style={{ textShadow: "0 0 8px rgba(239, 68, 68, 0.8)" }}>Half sheet booked</span>
              <span className="font-black text-[16px] sm:text-[18px] leading-tight mt-0.5" style={{ textShadow: "0 0 8px rgba(239, 68, 68, 0.8)" }}>{halfSheetBooked}</span>
            </div>

            <div className="w-full border border-red-600 rounded-md py-1.5 flex flex-col items-center justify-center text-red-500 shadow-[inset_0_0_10px_rgba(220,38,38,0.2)]">
              <span className="font-bold text-[15px] sm:text-[16px] leading-tight" style={{ textShadow: "0 0 8px rgba(239, 68, 68, 0.8)" }}>Full sheet booked</span>
              <span className="font-black text-[16px] sm:text-[18px] leading-tight mt-0.5" style={{ textShadow: "0 0 8px rgba(239, 68, 68, 0.8)" }}>{fullSheetBooked}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
