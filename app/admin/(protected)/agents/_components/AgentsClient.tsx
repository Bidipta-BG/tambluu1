"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/cn";
import type { Agent } from "@/types";
import AddAgentModal from "./AddAgentModal";

interface AgentsClientProps {
  tenantId: string;
  initialAgents: Agent[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function AgentsClient({ tenantId, initialAgents }: AgentsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [showAddModal, setShowAddModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  async function handleToggleStatus(agent: Agent) {
    setProcessingId(agent.id);
    
    const newStatus = agent.status === "active" ? "inactive" : "active";
    
    // Optimistic update
    const previousAgents = [...agents];
    setAgents(agents.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/agents/${agent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        let msg = "Failed to update agent status";
        try {
          const body = await res.json();
          msg = body.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }

      showToast(`Agent ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`, "success");
      router.refresh();
    } catch (err: any) {
      setAgents(previousAgents);
      showToast(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-50">Agents</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your agents and view their performance.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-violet-500 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Agent
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Agent</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Comm. (₹)</th>
                <th className="px-6 py-4 font-semibold">Tickets Sold</th>
                <th className="px-6 py-4 font-semibold">Agent Earnings</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No agents found. Add one to get started!
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className={cn(
                    "hover:bg-slate-800/30 transition-colors",
                    agent.status === "inactive" && "opacity-50 grayscale-[0.5]"
                  )}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">{agent.name}</p>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1">
                        <span>{agent.phone}</span>
                        <span className="text-slate-600">|</span>
                        <span className="font-mono text-violet-400">Pass: {(agent as any).plain_password || '********'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                        agent.status === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">₹{agent.commission_per_ticket}</td>
                    <td className="px-6 py-4 font-semibold text-slate-200">{agent.total_tickets_sold || 0}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">₹{(agent.agent_earnings || 0).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if (agent.status === "active") {
                            if (!window.confirm(`Are you sure you want to disable ${agent.name}? They will no longer be able to log in or book tickets.`)) return;
                          } else {
                            if (!window.confirm(`Are you sure you want to enable ${agent.name}?`)) return;
                          }
                          handleToggleStatus(agent);
                        }}
                        disabled={processingId === agent.id}
                        className={cn(
                          "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                          agent.status === "active" 
                            ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" 
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        )}
                      >
                        {agent.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddAgentModal
          tenantId={tenantId}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
