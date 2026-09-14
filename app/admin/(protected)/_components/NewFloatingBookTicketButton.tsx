"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Game, Ticket } from "@/types";
import AdminQuickBookModal from "./AdminQuickBookModal";

interface Props {
  tenantId: string;
  game: Game | null;
  tickets: Ticket[];
}

export function NewFloatingBookTicketButton({ tenantId, game, tickets }: Props) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();
  
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  
  const [isBooking, setIsBooking] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isPending || isBooking) {
      showLoader(isBooking ? `Booking Ticket(s)...` : "Refreshing Tickets...");
    } else {
      hideLoader();
    }
  }, [isPending, isBooking, showLoader, hideLoader]);

  if (!game || game.booking_status !== "open") {
    return null;
  }

  const availableTickets = tickets.filter(t => t.status === "available");
  const bookedCount = tickets.filter(t => t.status === "booked").length;

  const handleToggleTicket = (ticket: Ticket) => {
    setSelectedTickets(prev => {
      const exists = prev.find(t => t.id === ticket.id);
      if (exists) return prev.filter(t => t.id !== ticket.id);
      return [...prev, ticket];
    });
  };

  const handleBookTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTickets.length === 0) return;

    setIsBooking(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };
      
      const results = await Promise.allSettled(
        selectedTickets.map(ticket => 
          api.post(
            `/tenants/${tenantId}/games/${game.id}/tickets/${ticket.id}/book-direct`,
            { playerName, playerPhone },
            { headers }
          )
        )
      );
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed === 0) {
        showToast(`Successfully booked ${succeeded} ticket(s) for ${playerName}!`, "success");
      } else if (succeeded > 0) {
        showToast(`Booked ${succeeded} ticket(s). ${failed} failed (likely already taken).`, "error");
      } else {
        showToast(`Failed to book any tickets. They might be already taken.`, "error");
      }

      setShowQuickBook(false);
      setSelectedTickets([]);
      setPlayerName("");
      setPlayerPhone("");
      
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      showToast(err.message || "Failed to book tickets", "error");
      setShowQuickBook(false);
      
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <button
          onClick={() => setShowQuickBook(true)}
          className="w-[70%] max-w-sm bg-[#ff0000] hover:bg-red-700 text-white font-bold text-base py-2.5 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-transform active:scale-95 pointer-events-auto"
        >
          BOOK TICKET
        </button>
      </div>

      {showQuickBook && (
        <AdminQuickBookModal
          tickets={tickets}
          selectedTickets={selectedTickets}
          onToggleTicket={handleToggleTicket}
          totalCount={tickets.length}
          bookedCount={bookedCount}
          availableCount={availableTickets.length}
          onClose={() => setShowQuickBook(false)}
          playerName={playerName}
          setPlayerName={setPlayerName}
          playerPhone={playerPhone}
          setPlayerPhone={setPlayerPhone}
          onBook={handleBookTicket}
          isBooking={isBooking}
        />
      )}
    </>
  );
}
