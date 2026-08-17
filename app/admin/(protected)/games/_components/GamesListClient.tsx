"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import type { GameWithSummary } from "@/types";
import CreateGameModal from "./CreateGameModal";
import ManageGameModal from "./ManageGameModal";

interface GamesListClientProps {
  tenantId: string;
  initialGames: GameWithSummary[];
}

export default function GamesListClient({ tenantId, initialGames }: GamesListClientProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingGameId, setManagingGameId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPending) {
      setLoadingAction(null);
      hideLoader();
    }
  }, [isPending]);

  const hasActiveGame = initialGames.some(game => game.booking_status === "open");

  const handleAction = async (gameId: string, action: "stop" | "activate" | "deactivate") => {
    if (action === "stop" && !confirm("Are you sure you want to end this game?")) return;
    if (action === "deactivate" && !confirm("Are you sure you want to deactivate this game? Once deactivated, it cannot be activated again.")) return;

    setLoadingAction(`${gameId}-${action}`);
    
    if (action === "stop") showLoader("Ending Game...");
    else if (action === "activate") showLoader("Activating Game...");
    else if (action === "deactivate") showLoader("Deactivating Game...");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      if (action === "stop") {
        await api.post(`/tenants/${tenantId}/games/${gameId}/stop`, {}, { headers });
      } else if (action === "activate") {
        await api.patch(`/tenants/${tenantId}/games/${gameId}`, { booking_status: "open" }, { headers });
      } else if (action === "deactivate") {
        await api.patch(`/tenants/${tenantId}/games/${gameId}`, { booking_status: "closed" }, { headers });
      }
      
      showLoader("Refreshing Dashboard...");
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      alert(`Error performing action: ${e.message}`);
      setLoadingAction(null);
      hideLoader();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Games</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your Tambola games.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={hasActiveGame}
          title={hasActiveGame ? "Deactivate the currently active game to create a new one" : ""}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow transition ${
            hasActiveGame ? 'bg-slate-600 opacity-50 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create game
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Scheduled Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Total Tickets</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {initialGames.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No games found. Create one to get started!
                  </td>
                </tr>
              ) : (
                (isExpanded ? initialGames : initialGames.slice(0, 4)).map((game) => {
                  const isActivating = loadingAction === `${game.id}-activate`;
                  const isDeactivating = loadingAction === `${game.id}-deactivate`;
                  const isStopping = loadingAction === `${game.id}-stop`;
                  const isLoading = isActivating || isDeactivating || isStopping;
                  
                  return (
                    <tr key={game.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        {game.scheduled_at
                          ? new Date(game.scheduled_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "TBD"}
                      </td>
                      <td className="px-6 py-4">
                        {game.booking_status === "open" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700 capitalize">
                            {game.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {game.total_tickets}
                      </td>
                      <td className="px-6 py-4">₹{game.ticket_price}</td>
                      <td className="px-6 py-4 text-right">
                        {game.booking_status === "open" ? (
                          <div className="flex items-center justify-end gap-3">
                            {game.status === "running" && (
                              <button
                                onClick={() => handleAction(game.id, "stop")}
                                disabled={isLoading}
                                className="text-amber-500 hover:text-amber-400 text-xs font-bold uppercase tracking-wider"
                              >
                                {isStopping ? "..." : "End Game"}
                              </button>
                            )}
                            <button
                              onClick={() => setManagingGameId(game.id)}
                              disabled={isLoading}
                              className="text-violet-400 hover:text-violet-300 text-xs font-bold uppercase tracking-wider"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleAction(game.id, "deactivate")}
                              disabled={isLoading}
                              className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider"
                            >
                              {isDeactivating ? "..." : "Deactivate"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold uppercase tracking-wider text-xs bg-slate-800/50 px-3 py-1 rounded-md border border-slate-700">
                            Expired
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {initialGames.length > 4 && (
          <div className="border-t border-slate-800 bg-slate-800/20 p-4 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-2"
            >
              {isExpanded ? (
                <>
                  Show Less
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  View All Games ({initialGames.length})
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateGameModal
          tenantId={tenantId}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {managingGameId && (
        <ManageGameModal
          tenantId={tenantId}
          gameId={managingGameId}
          onClose={() => setManagingGameId(null)}
        />
      )}
    </div>
  );
}
