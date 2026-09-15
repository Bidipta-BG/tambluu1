"use client";

import React, { useState } from "react";
import type { Game } from "@/types";
import { NewRunGameModal } from "./NewRunGameModal";
import { useRouter } from "next/navigation";

interface Props {
  tenantId: string;
  game: Game | null;
}

export function NewRunGameSection({ tenantId, game }: Props) {
  const [showRunGameModal, setShowRunGameModal] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    setShowRunGameModal(false);
    router.refresh();
  };

  return (
    <>
      <div className="bg-[#0a0088] rounded shadow-lg border border-[#3333ff] overflow-hidden flex flex-col">
        <h2 className="text-white font-black text-center text-sm sm:text-base py-3 uppercase tracking-wide">
          START GAME CALLING
        </h2>
        <div className="p-4 sm:p-6 flex justify-center items-center">
          <button 
            onClick={() => setShowRunGameModal(true)}
            className="w-full sm:w-3/4 max-w-md bg-[#ff0000] active:bg-red-700 text-white font-black text-lg sm:text-xl py-8 sm:py-10 rounded-lg shadow-xl uppercase tracking-wider"
          >
            RUN GAME
          </button>
        </div>
      </div>

      {/* Pop-up modal */}
      {game && (
        <NewRunGameModal 
          isOpen={showRunGameModal} 
          onClose={handleClose}
          tenantId={tenantId}
          gameId={game.id}
          initialScheduledAt={game.scheduled_at ?? undefined}
          initialInterval={game.call_interval_seconds ?? undefined}
        />
      )}
    </>
  );
}
