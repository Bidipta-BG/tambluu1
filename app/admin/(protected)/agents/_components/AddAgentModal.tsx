"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";

interface AddAgentModalProps {
  tenantId: string;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function AddAgentModal({ tenantId, onClose }: AddAgentModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [commission, setCommission] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    showLoader("Creating Agent...");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const formattedPhone = phone.trim();

      const payload = {
        name,
        phone: formattedPhone,
        password,
        commissionPerTicket: parseFloat(commission),
      };

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to add agent";
        try {
          const body = await res.json();
          msg = body.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }

      showToast("Agent added successfully!", "success");
      onClose();
      showLoader("Refreshing Agents...");
      router.refresh();
      setTimeout(() => hideLoader(), 500);
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
      hideLoader();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-50">Add New Agent</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Phone</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
              placeholder="Username or Phone (min 3 chars)"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Password</label>
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
              placeholder="Temporary password"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Commission Per Ticket (₹)</label>
            <input
              type="number"
              required
              min="0"
              step="0.1"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-6">
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
              {loading ? "Adding..." : "Add Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
