"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";

type Ticket = {
  ticket_number: number;
  player_name?: string | null;
  player_phone?: string | null;
  booked_via?: string | null;
  agent_name?: string | null;
};

type GameHistory = {
  id: string;
  status: string;
  scheduled_at: string;
  completed_at?: string;
  total_tickets?: number;
  tickets: Ticket[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  currentGameId: string | null;
};

export function NewLoadBackupModal({ isOpen, onClose, tenantId, currentGameId }: Props) {
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameHistory | null>(null);
  
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      setSelectedGame(null);
      return;
    }
    
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      api.get(`/tenants/${tenantId}/games/ticket-history`, { headers })
        .then((data: any) => {
          setGames(data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [isOpen, tenantId]);

  const handleLoadBackup = async () => {
    if (!selectedGame || !currentGameId) return;

    setIsSubmitting(true);
    showLoader("Loading backup tickets...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;

      const res = await api.post<any>(`/tenants/${tenantId}/games/${currentGameId}/load-backup`, {
        sourceGameId: selectedGame.id
      }, { headers });

      showToast(`Backup loaded! ${res.ticketsLoaded || 0} tickets imported.`, "success");
      onClose();
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to load backup tickets", "error");
    } finally {
      setIsSubmitting(false);
      hideLoader();
    }
  };

  const formatDateLine1 = (isoString: string) => {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateLine2 = (isoString: string) => {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-[#0b00c4] w-full max-w-lg rounded-md overflow-hidden shadow-2xl flex flex-col relative border-2 border-blue-600 max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-center items-center p-3 relative bg-[#0b00c4]">
          <h3 className="text-white font-black text-lg sm:text-xl tracking-wide text-center uppercase">
            {selectedGame ? "Confirm Backup" : "Load Backup by Date"}
          </h3>

          <button 
            onClick={onClose}
            className="absolute right-2 top-2 bg-[#ff522b] hover:bg-red-500 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto ${selectedGame ? 'bg-white p-4' : 'bg-[#0b00c4] p-2 sm:p-4'}`}>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <span className={selectedGame ? "text-black font-bold flex items-center gap-2" : "text-white font-bold flex items-center gap-2"}>
                <Spinner /> Loading history...
              </span>
            </div>
          ) : !selectedGame ? (
            // Date Grid View
            <div className="w-full">
              {!currentGameId ? (
                <div className="p-4 text-white text-center font-bold bg-red-600 rounded">
                  No active game found! You must create a game first before loading a backup.
                </div>
              ) : games.length === 0 ? (
                <div className="p-4 text-white text-center font-bold">No game history available.</div>
              ) : (
                <div className="grid grid-cols-3 border-l-2 border-t-2 border-black">
                  {games.map(g => (
                    <div 
                      key={g.id} 
                      onClick={() => setSelectedGame(g)}
                      className="bg-white border-r-2 border-b-2 border-black p-1 sm:p-2 text-center cursor-pointer hover:bg-gray-200 transition-colors flex flex-col justify-center min-h-[60px] sm:min-h-[80px]"
                    >
                      <div className="font-black text-sm sm:text-base text-black whitespace-nowrap mb-0.5">
                        {formatDateLine1(g.completed_at || g.scheduled_at)}
                      </div>
                      <div className="font-black text-sm sm:text-base text-black whitespace-nowrap">
                        {formatDateLine2(g.completed_at || g.scheduled_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Confirmation View
            <div className="flex flex-col items-center">
              <div className="bg-red-100 border-2 border-red-600 text-red-700 p-4 rounded-md mb-6 font-bold text-center">
                <span className="text-xl mb-2 block">⚠️ WARNING</span>
                This will permanently replace ALL current tickets with the backup from 
                <br/>
                <span className="text-black inline-block mt-2 mb-2 bg-white px-2 py-1 rounded">
                  {formatDateLine1(selectedGame.completed_at || selectedGame.scheduled_at)} {formatDateLine2(selectedGame.completed_at || selectedGame.scheduled_at)}
                </span>
                <br/>
                <div className="bg-white/50 inline-block px-3 py-1 rounded border border-red-200 mb-3 text-sm text-red-900">
                  Total Tickets: <span className="font-black text-black">{selectedGame.total_tickets || 0}</span> | 
                  Booked: <span className="font-black text-black">{selectedGame.tickets.length}</span>
                </div>
                <br/>
                Any existing bookings in the current game will be lost and overwritten. Are you sure?
              </div>
              
              <div className="flex w-full gap-4">
                <button 
                  onClick={() => setSelectedGame(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-black font-bold py-3 rounded-md transition-colors disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleLoadBackup}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <><Spinner /> LOADING...</> : "LOAD BACKUP"}
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
