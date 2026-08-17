"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/cn";
import type { BookingRequest, BookingRequestStatus } from "@/types";

interface BookingRequestsClientProps {
  tenantId: string;
  initialRequests: BookingRequest[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const TABS: { id: BookingRequestStatus | "all"; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
  { id: "all", label: "All" },
];

export default function BookingRequestsClient({ tenantId, initialRequests }: BookingRequestsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<BookingRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<BookingRequestStatus | "all">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredRequests = requests.filter(
    (req) => activeTab === "all" || req.status === activeTab
  );

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessingId(requestId);
    
    // Optimistic update
    const previousRequests = [...requests];
    const newStatus: BookingRequestStatus = action === "approve" ? "approved" : "rejected";
    
    setRequests(
      requests.map((r) =>
        r.id === requestId ? { ...r, status: newStatus } : r
      )
    );

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/booking-requests/${requestId}/${action}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        },
      });

      if (!res.ok) {
        let msg = `Failed to ${action} request`;
        try {
          const body = await res.json();
          msg = body.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }

      showToast(`Request ${action}d successfully`, "success");
      router.refresh();
    } catch (err: any) {
      // Revert optimistic update on error
      setRequests(previousRequests);
      showToast(err.message || "An error occurred", "error");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-50">Booking Requests</h1>
          <p className="text-sm text-slate-400 mt-1">Review player requests for tickets.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-slate-900 p-1 w-full max-w-md">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-full rounded-lg py-2 text-sm font-medium leading-5 transition-colors",
              activeTab === tab.id
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:bg-slate-800/[0.12] hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Player</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Ticket #</th>
                <th className="px-6 py-4 font-semibold">Requested At</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No requests found for this filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-200">{req.player_name}</td>
                    <td className="px-6 py-4">{req.player_phone}</td>
                    <td className="px-6 py-4 font-mono text-violet-400">{req.ticket_number ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(req.created_at).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                        req.status === "pending" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        req.status === "approved" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        req.status === "rejected" && "bg-red-500/10 text-red-500 border-red-500/20",
                        req.status === "expired" && "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(req.id, "approve")}
                            disabled={processingId === req.id}
                            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "reject")}
                            disabled={processingId === req.id}
                            className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
