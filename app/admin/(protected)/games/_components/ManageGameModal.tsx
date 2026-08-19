"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Game, Dividend } from "@/types";

interface ManageGameModalProps {
  tenantId: string;
  gameId: string;
  onClose: () => void;
}

function EditGameForm({ tenantId, game, onSuccess }: { tenantId: string; game: Game; onSuccess: () => void }) {
  const router = useRouter();
  const [totalTickets, setTotalTickets] = useState<number | string>(game.total_tickets ?? 600);
  const [ticketPrice, setTicketPrice] = useState<number | string>(game.ticket_price ?? 100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const tTickets = Number(totalTickets);
    const price = Number(ticketPrice);

    if (isNaN(tTickets) || tTickets <= 0 || tTickets > 1000) {
      return setError("Total Tickets must be between 1 and 1000.");
    }
    if (price <= 0) {
      return setError("Ticket Price must be greater than 0.");
    }

    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      await api.patch(`/tenants/${tenantId}/games/${game.id}`, {
        totalTickets: tTickets,
        ticketPrice: price,
      }, { headers });
      alert("Game updated successfully!");
      router.refresh();
      onSuccess();
    } catch (e: any) {
      alert("Error saving game: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-4">Edit Game Details</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Total Tickets (Max 1000)</label>
            <input 
              type="number" 
              min="1" 
              max="1000"
              value={totalTickets}
              onChange={(e) => {
                const str = e.target.value;
                if (str === "") {
                  setTotalTickets("");
                  return;
                }
                const val = Number(str);
                if (val < 1) {
                  setTotalTickets(1);
                } else if (val > 1000) {
                  setTotalTickets(1000);
                } else {
                  setTotalTickets(val);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Ticket Price (₹)</label>
            <input 
              type="number" 
              min="1" 
              value={ticketPrice}
              onChange={(e) => {
                const str = e.target.value;
                if (str === "") {
                  setTicketPrice("");
                  return;
                }
                const val = Number(str);
                if (val < 1) {
                  setTicketPrice(1);
                } else {
                  setTicketPrice(val);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg text-sm transition"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>

      {/* Placeholder for future sections */}
      <div className="mt-8 pt-6 border-t border-slate-800">
        <h4 className="text-sm font-semibold text-slate-500 mb-2">Coming Soon</h4>
        <p className="text-xs text-slate-600">Winners details and tickets sold information will appear here.</p>
      </div>
    </div>
  );
}

export default function ManageGameModal({ tenantId, gameId, onClose }: ManageGameModalProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchGame() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not logged in");

        const res = await api.get<{ dividends?: Dividend[] } & Game>(`/tenants/${tenantId}/games/${gameId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        setGame(res as Game);
        setDividends(res.dividends || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGame();
  }, [tenantId, gameId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Manage Game</h2>
            <p className="text-xs text-slate-400 mt-1">ID: {gameId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 bg-slate-950">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-center">
              Failed to load game: {error}
            </div>
          ) : game ? (
            <EditGameForm tenantId={tenantId} game={game} onSuccess={onClose} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
