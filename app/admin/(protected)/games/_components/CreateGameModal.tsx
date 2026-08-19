"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { cn } from "@/lib/cn";
import type { GameCreatePayload } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface CreateGameModalProps {
  tenantId: string;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function CreateGameModal({ tenantId, onClose }: CreateGameModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();

  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [minDateTime, setMinDateTime] = useState("");
  
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 10);
  });
  const [hour, setHour] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let h = tomorrow.getHours() % 12;
    if (h === 0) h = 12;
    return h.toString().padStart(2, "0");
  });
  const [minute, setMinute] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getMinutes().toString().padStart(2, "0");
  });
  const [ampm, setAmpm] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getHours() >= 12 ? "PM" : "AM";
  });
  const [totalTickets, setTotalTickets] = useState("100");
  const [ticketPrice, setTicketPrice] = useState("50");
  const [agencyCommission, setAgencyCommission] = useState("10");
  const [callIntervalSeconds, setCallIntervalSeconds] = useState("10");

  useEffect(() => {
    // Get current local date formatted for input type="date" min attribute
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTime(now.toISOString().slice(0, 10)); // YYYY-MM-DD
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      showToast("Please select a valid date.", "error");
      return;
    }

    let h = parseInt(hour, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;

    dateObj.setHours(h, parseInt(minute, 10), 0, 0);

    const tTickets = parseInt(totalTickets, 10);
    if (isNaN(tTickets) || tTickets <= 0) {
      showToast("Total tickets must be greater than 0.", "error");
      return;
    }
    if (tTickets >= 1001) {
      showToast("Total tickets must be less than or equal to 1000.", "error");
      return;
    }

    if (dateObj <= new Date()) {
      showToast("Scheduled date and time must be in the future.", "error");
      return;
    }

    setLoading(true);
    showLoader("Creating Game...");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const payload = {
        scheduledAt: dateObj.toISOString(),
        totalTickets: parseInt(totalTickets, 10),
        ticketPrice: parseFloat(ticketPrice),
        agencyCommission: parseFloat(agencyCommission),
        callIntervalSeconds: parseInt(callIntervalSeconds, 10),
      };

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/games`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to create game";
        try {
          const body = await res.json();
          msg = body.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }

      showToast("Game created successfully!", "success");
      showLoader("Refreshing Dashboard...");
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
      setLoading(false);
      hideLoader();
    }
  }

  // Close the modal only AFTER the background transition (refresh) is complete
  useEffect(() => {
    if (!isPending && loading) {
      setLoading(false);
      hideLoader();
      onClose();
    }
  }, [isPending]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-50">Create New Game</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Scheduled At</label>
            <div className="flex gap-2">
              <input
                type="date"
                required
                min={minDateTime}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              />
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const h = (i + 1).toString().padStart(2, "0");
                  return <option key={h} value={h}>{h}</option>;
                })}
              </select>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const m = i.toString().padStart(2, "0");
                  return <option key={m} value={m}>{m}</option>;
                })}
              </select>
              <select
                value={ampm}
                onChange={(e) => setAmpm(e.target.value)}
                className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Total Tickets
                </label>
                <input
                  type="number"
                  required
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
                    if (val < 1) setTotalTickets("1");
                    else if (val > 1000) setTotalTickets("1000");
                    else setTotalTickets(str);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Ticket Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={ticketPrice}
                  onChange={(e) => {
                    const str = e.target.value;
                    if (str === "") {
                      setTicketPrice("");
                      return;
                    }
                    const val = Number(str);
                    if (val < 1) setTicketPrice("1");
                    else setTicketPrice(str);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
                />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Agency Comm. (%)</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.1"
                value={agencyCommission}
                onChange={(e) => setAgencyCommission(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Call Interval (s)</label>
              <input
                type="number"
                required
                min="1"
                value={callIntervalSeconds}
                onChange={(e) => setCallIntervalSeconds(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Game"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
