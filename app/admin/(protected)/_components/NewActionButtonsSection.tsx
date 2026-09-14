"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import type { Game } from "@/types";
import { NewCurrentTicketsModal } from "./NewCurrentTicketsModal";
import { NewCurrentWinnersModal } from "./NewCurrentWinnersModal";
import { NewTicketHistoryModal } from "./NewTicketHistoryModal";
import { NewWinnerHistoryModal } from "./NewWinnerHistoryModal";
import { NewBusinessHistoryModal } from "./NewBusinessHistoryModal";
import { NewLoadBackupModal } from "./NewLoadBackupModal";

interface NewActionButtonsSectionProps {
  tenantId: string;
  game: Game | null;
}

export default function NewActionButtonsSection({ tenantId, game }: NewActionButtonsSectionProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [isPending, startTransition] = useTransition();

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showCurrentTicketModal, setShowCurrentTicketModal] = useState(false);
  const [showCurrentWinnerModal, setShowCurrentWinnerModal] = useState(false);
  const [showTicketHistoryModal, setShowTicketHistoryModal] = useState(false);
  const [showWinnerHistoryModal, setShowWinnerHistoryModal] = useState(false);
  const [showBusinessHistoryModal, setShowBusinessHistoryModal] = useState(false);

  const handleResetCall = async () => {
    const confirm = window.confirm("Are you sure you want to reset called numbers?");
    if (!confirm) return;

    if (!game) return alert("No active game found.");

    if (game.status === 'scheduled') {
      showLoader("Resetting Call...");
      setTimeout(() => {
        hideLoader();
        alert("Call reset successfully.");
      }, 1000);
      return;
    }

    try {
      showLoader("Resetting Call...");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };
      await api.post(`/tenants/${tenantId}/games/${game.id}/reset-call`, {}, { headers });
      
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => {
        hideLoader();
        alert("Call reset successfully.");
      }, 500);
    } catch (e: any) {
      console.error(e);
      hideLoader();
      alert("Failed to reset call: " + e.message);
    }
  };

  const handleResetTicket = async () => {
    const confirm = window.confirm("Are you sure you want to reset entire tickets?");
    if (!confirm) return;

    if (!game) return alert("No active game found.");

    try {
      showLoader("Resetting Tickets...");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };
      await api.post(`/tenants/${tenantId}/games/${game.id}/reset-tickets`, {}, { headers });
      
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => {
        hideLoader();
        alert("Tickets reset successfully.");
      }, 500);
    } catch (e: any) {
      console.error(e);
      hideLoader();
      alert("Failed to reset tickets: " + e.message);
    }
  };

  const handleResetAgent = async () => {
    const confirm = window.confirm("Are you sure you want to reset entire agents?");
    if (!confirm) return;

    try {
      showLoader("Resetting Agents...");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };
      await api.del(`/tenants/${tenantId}/agents`, { headers });
      
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => {
        hideLoader();
        alert("Agents reset successfully.");
      }, 500);
    } catch (e: any) {
      console.error(e);
      hideLoader();
      alert("Failed to reset agents: " + e.message);
    }
  };

  const buttons = [
    { text: "RESET CALL", onClick: handleResetCall },
    { text: "RESET TICKET", onClick: handleResetTicket },
    { text: "RESET AGENT", onClick: handleResetAgent },
    { text: "LOAD BACKUP\nTICKET", onClick: () => setShowBackupModal(true) },
    { text: "SHOW CURRENT\nTICKET", onClick: () => setShowCurrentTicketModal(true) },
    { text: "SHOW CURRENT\nWINNER", onClick: () => setShowCurrentWinnerModal(true) },
    { text: "SHOW TICKET\nHISTORY", onClick: () => setShowTicketHistoryModal(true) },
    { text: "SHOW WINNER\nHISTORY", onClick: () => setShowWinnerHistoryModal(true) },
    { text: "SHOW BUSINESS\nHISTORY", onClick: () => setShowBusinessHistoryModal(true) }
  ];

  return (
    <>
      <div className="w-full bg-[#0a0088] flex flex-col items-center p-4 shadow-lg mx-auto max-w-xl text-center">
        <h2 className="text-white font-black text-xl uppercase tracking-wider mb-2">
          ACTION BUTTON
        </h2>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full mt-2">
          {buttons.map((btn, i) => (
            <button 
              key={i}
              onClick={(e) => {
                e.currentTarget.blur();
                btn.onClick();
              }}
              disabled={isPending}
              className="bg-[#ff0000] border-[2px] border-[#cc0000] active:bg-red-800 active:translate-y-1 focus:outline-none focus:ring-0 text-white font-black text-[10px] sm:text-xs leading-tight rounded-md flex items-center justify-center p-1 sm:p-2 h-16 sm:h-20 shadow-md transition-all whitespace-pre-wrap disabled:opacity-50"
            >
              {btn.text}
            </button>
          ))}
        </div>
      </div>

      {/* Backup Modal */}
      <NewLoadBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        tenantId={tenantId}
        currentGameId={game?.id || null}
      />

      {/* Show Current Tickets Modal */}
      {game && (
        <NewCurrentTicketsModal 
          isOpen={showCurrentTicketModal} 
          onClose={() => setShowCurrentTicketModal(false)} 
          tenantId={tenantId} 
          gameId={game.id} 
        />
      )}

      {/* Show Current Winners Modal */}
      {game && (
        <NewCurrentWinnersModal 
          isOpen={showCurrentWinnerModal} 
          onClose={() => setShowCurrentWinnerModal(false)} 
          tenantId={tenantId} 
        />
      )}

      {/* Show Ticket History Modal */}
      <NewTicketHistoryModal 
        isOpen={showTicketHistoryModal} 
        onClose={() => setShowTicketHistoryModal(false)} 
        tenantId={tenantId} 
      />

      {/* Show Winner History Modal */}
      <NewWinnerHistoryModal 
        isOpen={showWinnerHistoryModal} 
        onClose={() => setShowWinnerHistoryModal(false)} 
        tenantId={tenantId} 
      />

      {/* Show Business History Modal */}
      <NewBusinessHistoryModal 
        isOpen={showBusinessHistoryModal} 
        onClose={() => setShowBusinessHistoryModal(false)} 
        tenantId={tenantId} 
      />
    </>
  );
}
